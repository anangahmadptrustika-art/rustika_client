import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { PROJECT_STATUSES, type ProjectStatus } from "@/lib/constants";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Google Sheet → app sync endpoint.
 *
 * The bound Apps Script ("Sync ke Aplikasi") POSTs project rows here with a
 * shared secret header. We UPSERT projects by `code` (never delete) and, when
 * the progress value changes, write a progress report — the DB trigger then
 * keeps projects.progress in sync (same path the app uses). Clients are matched
 * by name and auto-created when missing.
 *
 * Auth: header `x-sync-secret` must equal env SYNC_SECRET.
 */
type SheetRow = {
  client?: string;
  code?: string;
  name?: string;
  type?: string;
  status?: string;
  progress?: number | string;
  location?: string;
  start_date?: string;
  end_date?: string;
  contract_value?: number | string;
  note?: string;
};

function parseNumber(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const cleaned = String(v).replace(/[^0-9.-]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function clampProgress(v: unknown): number {
  const n = parseNumber(v) ?? 0;
  return Math.max(0, Math.min(100, n));
}

function normStatus(v: unknown): ProjectStatus {
  const s = String(v ?? "").trim().toUpperCase();
  return (PROJECT_STATUSES as readonly string[]).includes(s)
    ? (s as ProjectStatus)
    : "DESIGN";
}

function dateOrNull(v: unknown): string | null {
  const s = String(v ?? "").trim();
  return s || null; // Apps Script sends ISO yyyy-mm-dd
}

export async function POST(req: Request) {
  const secret = process.env.SYNC_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "Sync belum dikonfigurasi: SYNC_SECRET kosong." },
      { status: 500 }
    );
  }
  if (req.headers.get("x-sync-secret") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let rows: SheetRow[];
  try {
    const body = await req.json();
    rows = Array.isArray(body) ? body : body?.rows;
    if (!Array.isArray(rows)) throw new Error("not an array");
  } catch {
    return NextResponse.json(
      { error: "Body harus array baris (atau { rows: [...] })." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);
  let created = 0;
  let updated = 0;
  let skipped = 0;
  const errors: string[] = [];

  // Cache existing clients by lowercased name (auto-create on miss).
  const { data: clientRows } = await admin.from("clients").select("id, name");
  const clientByName = new Map<string, string>();
  for (const c of clientRows ?? []) {
    clientByName.set(String(c.name).trim().toLowerCase(), c.id as string);
  }

  for (const row of rows) {
    try {
      const code = String(row.code ?? "").trim();
      const name = String(row.name ?? "").trim();
      const clientName = String(row.client ?? "").trim();
      if (!code || !name || !clientName) {
        skipped++;
        continue;
      }

      // Resolve / auto-create client.
      let clientId = clientByName.get(clientName.toLowerCase());
      if (!clientId) {
        const { data: newClient, error: cErr } = await admin
          .from("clients")
          .insert({ name: clientName })
          .select("id")
          .single();
        if (cErr || !newClient) {
          errors.push(`Client "${clientName}" gagal dibuat`);
          skipped++;
          continue;
        }
        clientId = newClient.id as string;
        clientByName.set(clientName.toLowerCase(), clientId);
      }

      const fields = {
        name,
        client_id: clientId,
        project_type: String(row.type ?? "").trim() || null,
        location: String(row.location ?? "").trim() || null,
        status: normStatus(row.status),
        start_date: dateOrNull(row.start_date),
        end_date: dateOrNull(row.end_date),
        contract_value: parseNumber(row.contract_value),
      };
      const sheetProgress = clampProgress(row.progress);
      const note = String(row.note ?? "").trim() || "Pembaruan via Spreadsheet";

      const { data: existing } = await admin
        .from("projects")
        .select("id, progress")
        .eq("code", code)
        .maybeSingle();

      if (existing) {
        await admin.from("projects").update(fields).eq("id", existing.id);
        if (sheetProgress !== Number(existing.progress)) {
          await admin.from("project_progress").insert({
            project_id: existing.id,
            report_date: today,
            progress_percent: sheetProgress,
            description: note,
          });
        }
        updated++;
      } else {
        const { data: ins, error: pErr } = await admin
          .from("projects")
          .insert({ code, progress: sheetProgress, ...fields })
          .select("id")
          .single();
        if (pErr || !ins) {
          errors.push(`Proyek "${code}" gagal dibuat: ${pErr?.message ?? "?"}`);
          skipped++;
          continue;
        }
        if (sheetProgress > 0) {
          await admin.from("project_progress").insert({
            project_id: ins.id,
            report_date: today,
            progress_percent: sheetProgress,
            description: note,
          });
        }
        created++;
      }
    } catch (e) {
      errors.push((e as Error).message);
      skipped++;
    }
  }

  return NextResponse.json({
    ok: true,
    created,
    updated,
    skipped,
    errors: errors.slice(0, 20),
  });
}
