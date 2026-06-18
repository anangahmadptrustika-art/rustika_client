import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { PROJECT_STATUSES, type ProjectStatus } from "@/lib/constants";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Google Sheet → app sync endpoint.
 *
 * Body: { projects: ProjectRow[], progress: ProgressRow[] }
 *   - projects: upserted by `code` (never deleted); clients matched by name and
 *     auto-created when missing.
 *   - progress: dated progress entries upserted by (project code + date). Each
 *     becomes a progress report on that date — feeding the dashboard/portal
 *     charts — and the DB trigger keeps projects.progress at the latest date.
 *
 * Auth: header `x-sync-secret` must equal env SYNC_SECRET.
 */
type ProjectRow = {
  client?: string;
  code?: string;
  name?: string;
  type?: string;
  status?: string;
  location?: string;
  start_date?: string;
  end_date?: string;
  contract_value?: number | string;
};

type ProgressRow = {
  code?: string;
  date?: string;
  progress?: number | string;
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

  let projects: ProjectRow[] = [];
  let progress: ProgressRow[] = [];
  try {
    const body = await req.json();
    if (Array.isArray(body)) {
      projects = body; // backward-compatible: bare array = projects
    } else {
      projects = Array.isArray(body?.projects) ? body.projects : [];
      progress = Array.isArray(body?.progress) ? body.progress : [];
    }
  } catch {
    return NextResponse.json(
      { error: "Body harus { projects: [...], progress: [...] }." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const errors: string[] = [];

  // ── Clients cache (auto-create on miss) ──
  const { data: clientRows } = await admin.from("clients").select("id, name");
  const clientByName = new Map<string, string>();
  for (const c of clientRows ?? []) {
    clientByName.set(String(c.name).trim().toLowerCase(), c.id as string);
  }

  // ── 1) Projects (fields only; progress comes from the progress rows) ──
  const proj = { created: 0, updated: 0, skipped: 0 };
  for (const row of projects) {
    try {
      const code = String(row.code ?? "").trim();
      const name = String(row.name ?? "").trim();
      const clientName = String(row.client ?? "").trim();
      if (!code || !name || !clientName) {
        proj.skipped++;
        continue;
      }

      let clientId = clientByName.get(clientName.toLowerCase());
      if (!clientId) {
        const { data: newClient, error: cErr } = await admin
          .from("clients")
          .insert({ name: clientName })
          .select("id")
          .single();
        if (cErr || !newClient) {
          errors.push(`Client "${clientName}" gagal dibuat`);
          proj.skipped++;
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

      const { data: existing } = await admin
        .from("projects")
        .select("id")
        .eq("code", code)
        .maybeSingle();

      if (existing) {
        await admin.from("projects").update(fields).eq("id", existing.id);
        proj.updated++;
      } else {
        const { error: pErr } = await admin
          .from("projects")
          .insert({ code, ...fields });
        if (pErr) {
          errors.push(`Proyek "${code}" gagal dibuat: ${pErr.message}`);
          proj.skipped++;
          continue;
        }
        proj.created++;
      }
    } catch (e) {
      errors.push((e as Error).message);
      proj.skipped++;
    }
  }

  // ── 2) Dated progress entries (upsert by project code + date) ──
  const prog = { inserted: 0, updated: 0, skipped: 0 };
  if (progress.length) {
    const { data: allProjects } = await admin.from("projects").select("id, code");
    const projectByCode = new Map<string, string>();
    for (const p of allProjects ?? []) {
      projectByCode.set(String(p.code).trim(), p.id as string);
    }

    for (const row of progress) {
      try {
        const code = String(row.code ?? "").trim();
        const date = dateOrNull(row.date);
        if (!code || !date) {
          prog.skipped++;
          continue;
        }
        const projectId = projectByCode.get(code);
        if (!projectId) {
          errors.push(`Progress: kode "${code}" tidak ditemukan`);
          prog.skipped++;
          continue;
        }
        const value = clampProgress(row.progress);
        const note = String(row.note ?? "").trim() || "Pembaruan via Spreadsheet";

        const { data: ex } = await admin
          .from("project_progress")
          .select("id, progress_percent")
          .eq("project_id", projectId)
          .eq("report_date", date)
          .maybeSingle();

        if (ex) {
          if (Number(ex.progress_percent) !== value) {
            await admin
              .from("project_progress")
              .update({ progress_percent: value, description: note })
              .eq("id", ex.id);
            prog.updated++;
          } else {
            prog.skipped++;
          }
        } else {
          await admin.from("project_progress").insert({
            project_id: projectId,
            report_date: date,
            progress_percent: value,
            description: note,
          });
          prog.inserted++;
        }
      } catch (e) {
        errors.push((e as Error).message);
        prog.skipped++;
      }
    }
  }

  return NextResponse.json({
    ok: true,
    projects: proj,
    progress: prog,
    errors: errors.slice(0, 20),
  });
}
