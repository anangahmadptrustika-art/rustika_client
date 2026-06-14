import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { getAllDocuments, getProjects } from "@/lib/queries";
import { AI_ENABLED } from "@/lib/config";
import { formatCurrency } from "@/lib/utils";

export const runtime = "nodejs";

/**
 * AI Assistant endpoint.
 *
 * Features: progress summaries, document Q&A, natural-language document search,
 * and weekly/monthly report generation. Uses the Anthropic Claude API when
 * ANTHROPIC_API_KEY is set; otherwise falls back to a deterministic search over
 * the portal data so the feature is demonstrable without a key.
 */
export async function POST(req: Request) {
  const profile = await getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { message } = (await req.json()) as { message?: string };
  if (!message?.trim()) {
    return NextResponse.json({ error: "Empty message" }, { status: 400 });
  }

  // Build lightweight portal context for grounding.
  const [projects, documents] = await Promise.all([
    getProjects(),
    getAllDocuments(),
  ]);

  const context = [
    "PROYEK:",
    ...projects.map(
      (p) =>
        `- ${p.code} "${p.name}" | client: ${p.client?.name} | status: ${p.status} | progress: ${p.progress}% | lokasi: ${p.location} | nilai: ${formatCurrency(p.contract_value)}`
    ),
    "",
    "DOKUMEN:",
    ...documents.map(
      (d) =>
        `- "${d.name}" (v${d.version}, ${d.category}${d.subcategory ? "/" + d.subcategory : ""}) pada proyek ${d.project_name}`
    ),
  ].join("\n");

  // ── Fallback (no API key): deterministic keyword retrieval ──
  if (!AI_ENABLED) {
    const reply = localAnswer(message, projects, documents);
    return NextResponse.json({ reply, mode: "demo" });
  }

  // ── Anthropic Claude API ──
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
        max_tokens: 1024,
        system:
          "Anda adalah AI Assistant untuk portal manajemen proyek Rustika Consultant. " +
          "Jawab dalam Bahasa Indonesia, ringkas dan profesional. Gunakan KONTEKS PORTAL " +
          "berikut untuk menemukan dokumen/proyek yang relevan, membuat ringkasan progres, " +
          "atau menyusun laporan mingguan/bulanan. Jika informasi tidak ada di konteks, " +
          "katakan dengan jujur.\n\n=== KONTEKS PORTAL ===\n" +
          context,
        messages: [{ role: "user", content: message }],
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      return NextResponse.json(
        { reply: `Gagal menghubungi AI: ${res.status}. ${detail.slice(0, 200)}` },
        { status: 200 }
      );
    }

    const data = await res.json();
    const reply =
      data?.content?.map((c: { text?: string }) => c.text).join("\n") ??
      "Maaf, tidak ada jawaban.";
    return NextResponse.json({ reply, mode: "live" });
  } catch (e) {
    return NextResponse.json(
      { reply: `Terjadi kesalahan: ${(e as Error).message}` },
      { status: 200 }
    );
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
