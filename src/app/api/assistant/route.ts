import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { getAllDocuments, getProjects } from "@/lib/queries";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { AI_ENABLED } from "@/lib/config";
import { STORAGE_BUCKETS } from "@/lib/constants";
import { r2GetBytes } from "@/lib/r2";
import { cldGetBytes } from "@/lib/cloudinary";
import { formatCurrency } from "@/lib/utils";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_DOC_BYTES = 20 * 1024 * 1024; // ~20MB safety cap for AI analysis

/**
 * AI Assistant endpoint. Uses the Anthropic Claude API when ANTHROPIC_API_KEY
 * is set; otherwise falls back to deterministic search.
 *
 * If `documentId` is provided, the referenced PDF/image is downloaded from
 * Storage and sent to Claude for direct analysis (summary, extraction, Q&A).
 */
export async function POST(req: Request) {
  const profile = await getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { message, documentId } = (await req.json()) as {
    message?: string;
    documentId?: string;
  };
  if (!message?.trim()) {
    return NextResponse.json({ error: "Empty message" }, { status: 400 });
  }

  if (!AI_ENABLED) {
    if (documentId) {
      return NextResponse.json({
        reply:
          "Analisa dokumen membutuhkan AI aktif. Atur `ANTHROPIC_API_KEY` di Vercel lalu redeploy.",
        mode: "demo",
      });
    }
    const [projects, documents] = await Promise.all([getProjects(), getAllDocuments()]);
    return NextResponse.json({
      reply: localAnswer(message, projects, documents),
      mode: "demo",
    });
  }

  // ── Build a document block if a document is attached ──
  let docBlock:
    | { type: "document" | "image"; source: { type: "base64"; media_type: string; data: string } }
    | null = null;
  let docNote = "";

  if (documentId) {
    // Authorization: resolve the document through the USER-scoped client so RLS
    // decides whether this user may access it. Never fetch by id with the admin
    // client without this gate (prevents cross-tenant IDOR).
    const docRow = await getAccessibleDocument(documentId);
    if (!docRow) {
      return NextResponse.json({ reply: "Dokumen tidak ditemukan." }, { status: 200 });
    }
    const loaded = await fetchDocBytes(docRow);
    if (!loaded) {
      return NextResponse.json({ reply: "Dokumen tidak dapat dibaca." }, { status: 200 });
    }
    if (loaded.size > MAX_DOC_BYTES) {
      return NextResponse.json(
        { reply: "Dokumen terlalu besar untuk dianalisa AI (maks ~20 MB)." },
        { status: 200 }
      );
    }
    const ext = (loaded.doc.file_type || "").toLowerCase();
    if (ext === "pdf") {
      docBlock = {
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: loaded.base64 },
      };
    } else if (["jpg", "jpeg"].includes(ext)) {
      docBlock = { type: "image", source: { type: "base64", media_type: "image/jpeg", data: loaded.base64 } };
    } else if (ext === "png") {
      docBlock = { type: "image", source: { type: "base64", media_type: "image/png", data: loaded.base64 } };
    } else if (ext === "webp") {
      docBlock = { type: "image", source: { type: "base64", media_type: "image/webp", data: loaded.base64 } };
    } else {
      return NextResponse.json(
        {
          reply: `Tipe file ".${ext}" belum bisa dianalisa langsung. AI dapat menganalisa PDF dan gambar (JPG/PNG).`,
        },
        { status: 200 }
      );
    }
    docNote = `\n\nCatatan: pengguna melampirkan dokumen "${loaded.doc.name}" untuk dianalisa.`;
  }

  // ── Portal context for grounding (text) ──
  const [projects, documents] = await Promise.all([getProjects(), getAllDocuments()]);
  const context = [
    "PROYEK:",
    ...projects.map(
      (p) =>
        `- ${p.code} "${p.name}" | client: ${p.client?.name} | status: ${p.status} | progress: ${p.progress}% | lokasi: ${p.location} | nilai: ${formatCurrency(p.contract_value)}`
    ),
    "",
    "DOKUMEN:",
    ...documents
      .slice(0, 200)
      .map(
        (d) =>
          `- "${d.name}" (v${d.version}, ${d.category}${d.subcategory ? "/" + d.subcategory : ""}) pada proyek ${d.project_name}`
      ),
  ].join("\n");

  const userContent = docBlock
    ? [docBlock, { type: "text", text: message }]
    : message;

  try {
    const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 2048,
        system:
          "Anda adalah AI Assistant untuk portal manajemen proyek Rustika Consultant. " +
          "Jawab dalam Bahasa Indonesia, ringkas, terstruktur, dan profesional. Gunakan " +
          "KONTEKS PORTAL untuk menemukan dokumen/proyek, membuat ringkasan progres, atau " +
          "menyusun laporan. Jika ada dokumen dilampirkan, baca & analisa isinya (ringkasan, " +
          "poin penting, ekstraksi data, atau jawab pertanyaan tentang dokumen tsb). Jika " +
          "informasi tidak ada, katakan dengan jujur." +
          docNote +
          "\n\n=== KONTEKS PORTAL ===\n" +
          context,
        messages: [{ role: "user", content: userContent }],
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      return NextResponse.json(
        { reply: `Gagal menghubungi AI: ${res.status}. ${detail.slice(0, 300)}` },
        { status: 200 }
      );
    }

    const data = await res.json();
    const reply =
      data?.content?.map((c: { text?: string }) => c.text).filter(Boolean).join("\n") ??
      "Maaf, tidak ada jawaban.";
    return NextResponse.json({ reply, mode: "live" });
  } catch (e) {
    return NextResponse.json(
      { reply: `Terjadi kesalahan: ${(e as Error).message}` },
      { status: 200 }
    );
  }
}

/** Resolve a document only if RLS lets THIS user access it (no admin bypass). */
async function getAccessibleDocument(documentId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("project_documents")
    .select("*")
    .eq("id", documentId)
    .maybeSingle();
  return data ?? null;
}

/** Fetch the bytes of an already-authorized document. */
async function fetchDocBytes(doc: {
  storage?: string | null;
  file_url?: string | null;
  file_path: string;
  file_type?: string | null;
  name?: string | null;
}) {
  try {
    let buf: Buffer;
    if (doc.storage === "cloudinary") {
      if (!doc.file_url) return null;
      buf = await cldGetBytes(doc.file_url); // host-allowlisted in cldGetBytes (SSRF guard)
    } else if (doc.storage === "r2") {
      buf = await r2GetBytes(doc.file_path);
    } else {
      // Only the storage signing step needs the admin client.
      const admin = createAdminClient();
      const { data: signed } = await admin.storage
        .from(STORAGE_BUCKETS.documents)
        .createSignedUrl(doc.file_path, 120);
      if (!signed?.signedUrl) return null;
      const res = await fetch(signed.signedUrl);
      if (!res.ok) return null;
      buf = Buffer.from(await res.arrayBuffer());
    }
    return { doc, base64: buf.toString("base64"), size: buf.length };
  } catch {
    return null;
  }
}

// Deterministic retrieval used when no API key is configured.
function localAnswer(
  message: string,
  projects: Awaited<ReturnType<typeof getProjects>>,
  documents: Awaited<ReturnType<typeof getAllDocuments>>
): string {
  const q = message.toLowerCase();
  const matchedProjects = projects.filter(
    (p) =>
      q.includes(p.name.toLowerCase().split(" ")[0]) ||
      p.name.toLowerCase().split(" ").some((w) => w.length > 3 && q.includes(w))
  );
  const matchedDocs = documents.filter((d) => {
    const words = d.name.toLowerCase().split(/[\s\-_.]+/);
    return (
      words.some((w) => w.length > 3 && q.includes(w)) ||
      (q.includes("simbg") && d.category === "simbg") ||
      (q.includes("kajian") && d.category === "kajian_teknis") ||
      (q.includes("survey") && d.category === "survey")
    );
  });

  const lines: string[] = [];
  lines.push("**Mode demo** (atur `ANTHROPIC_API_KEY` untuk AI penuh).\n");

  if (q.includes("progress") || q.includes("ringkas")) {
    lines.push("**Ringkasan Progress:**");
    for (const p of (matchedProjects.length ? matchedProjects : projects).slice(0, 5)) {
      lines.push(`- ${p.name}: ${p.progress}% (${p.status})`);
    }
    return lines.join("\n");
  }

  if (matchedDocs.length > 0) {
    lines.push(`Ditemukan ${matchedDocs.length} dokumen relevan:`);
    for (const d of matchedDocs.slice(0, 8)) {
      lines.push(
        `- **${d.name}** (v${d.version}) — proyek ${d.project_name}${
          d.subcategory ? `, kategori ${d.subcategory}` : ""
        }`
      );
    }
    return lines.join("\n");
  }

  if (matchedProjects.length > 0) {
    lines.push("Proyek yang cocok:");
    for (const p of matchedProjects) {
      lines.push(`- ${p.code} ${p.name} — ${p.status}, ${p.progress}%`);
    }
    return lines.join("\n");
  }

  return (
    "Saya tidak menemukan hasil yang cocok di data portal. Coba sebutkan nama " +
    "proyek atau jenis dokumen (mis. \"gambar SIMBG proyek Kantor VALE\")."
  );
}
