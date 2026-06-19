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
  coordinates?: string; // raw, e.g. `2°31'33"S 121°21'29"E` or `-2.52, 121.35`
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

// Normalized project name — same rule used by the de-dupe/seed scripts, so the
// sheet matches existing projects even when their codes differ.
function normName(v: unknown): string {
  return String(v ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

// Degrees-minutes-seconds with hemisphere, e.g. 2°31'33.18"S — global so we can
// pull both the lat and lng halves out of one cell.
const COORD_DMS =
  /(\d+(?:\.\d+)?)\s*[°º]\s*(\d+(?:\.\d+)?)?\s*['′’]?\s*(\d+(?:\.\d+)?)?\s*["″”]?\s*([NSEW])/gi;

/** Parse a coordinate cell into decimal lat/lng. Accepts DMS or a decimal pair. */
function parseCoordinates(raw: unknown): { lat: number; lng: number } | null {
  const s = String(raw ?? "").trim();
  if (!s) return null;

  // 1) DMS — e.g. `2°31'33.18"S 121°21'29.74"E`
  COORD_DMS.lastIndex = 0;
  const dms: { value: number; hemi: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = COORD_DMS.exec(s)) !== null) {
    const deg = parseFloat(m[1]);
    const min = m[2] ? parseFloat(m[2]) : 0;
    const sec = m[3] ? parseFloat(m[3]) : 0;
    let val = deg + min / 60 + sec / 3600;
    const hemi = m[4].toUpperCase();
    if (hemi === "S" || hemi === "W") val = -val;
    dms.push({ value: val, hemi });
  }
  if (dms.length >= 2) {
    const lat = dms.find((d) => d.hemi === "N" || d.hemi === "S") ?? dms[0];
    const lng = dms.find((d) => d.hemi === "E" || d.hemi === "W") ?? dms[1];
    if (Number.isFinite(lat.value) && Number.isFinite(lng.value)) {
      return { lat: lat.value, lng: lng.value };
    }
  }

  // 2) Plain decimal pair — e.g. `-2.526, 121.358`
  const dec = s.match(/(-?\d+(?:\.\d+)?)\s*[,; ]\s*(-?\d+(?:\.\d+)?)/);
  if (dec) {
    const a = parseFloat(dec[1]);
    const b = parseFloat(dec[2]);
    if (Number.isFinite(a) && Number.isFinite(b)) {
      // In Indonesia latitude is small (|lat| ≲ 12), longitude large (≳ 90).
      if (Math.abs(a) <= 12 && Math.abs(b) >= 90) return { lat: a, lng: b };
      if (Math.abs(b) <= 12 && Math.abs(a) >= 90) return { lat: b, lng: a };
      return { lat: a, lng: b };
    }
  }
  return null;
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

  // Per-client project index (by code + by normalized name) so we can match an
  // existing project even when the sheet's code differs from the stored one —
  // this is what prevents the "same name, different code" duplicates.
  type ProjIndex = { byCode: Map<string, string>; byName: Map<string, string> };
  const projectIndexByClient = new Map<string, ProjIndex>();
  async function getProjectIndex(clientId: string): Promise<ProjIndex> {
    const cached = projectIndexByClient.get(clientId);
    if (cached) return cached;
    const { data } = await admin
      .from("projects")
      .select("id, code, name")
      .eq("client_id", clientId);
    const idx: ProjIndex = { byCode: new Map(), byName: new Map() };
    for (const p of data ?? []) {
      if (p.code) idx.byCode.set(String(p.code).trim(), p.id as string);
      idx.byName.set(normName(p.name), p.id as string);
    }
    projectIndexByClient.set(clientId, idx);
    return idx;
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

      const idx = await getProjectIndex(clientId);
      const coords = parseCoordinates(row.coordinates);
      const location = String(row.location ?? "").trim();
      const rawType = String(row.type ?? "").trim();
      const rawStatus = String(row.status ?? "").trim();

      // Match by exact code first, then fall back to the normalized name.
      const existingId = idx.byCode.get(code) ?? idx.byName.get(normName(name));

      if (existingId) {
        // Partial update: only overwrite fields the sheet actually provides, so
        // empty cells never blank out data that already exists in the app.
        const update: Record<string, unknown> = { code, name };
        if (rawType) update.project_type = rawType;
        if (location) update.location = location;
        if (rawStatus) update.status = normStatus(rawStatus);
        const sd = dateOrNull(row.start_date);
        if (sd) update.start_date = sd;
        const ed = dateOrNull(row.end_date);
        if (ed) update.end_date = ed;
        const cv = parseNumber(row.contract_value);
        if (cv !== null) update.contract_value = cv;
        if (coords) {
          update.latitude = coords.lat;
          update.longitude = coords.lng;
        }

        const { error: uErr } = await admin
          .from("projects")
          .update(update)
          .eq("id", existingId);
        if (uErr) {
          errors.push(`Proyek "${name}" gagal di-update: ${uErr.message}`);
          proj.skipped++;
          continue;
        }
        idx.byCode.set(code, existingId);
        idx.byName.set(normName(name), existingId);
        proj.updated++;
      } else {
        const { data: created, error: pErr } = await admin
          .from("projects")
          .insert({
            code,
            name,
            client_id: clientId,
            project_type: rawType || null,
            location: location || null,
            status: normStatus(rawStatus),
            start_date: dateOrNull(row.start_date),
            end_date: dateOrNull(row.end_date),
            contract_value: parseNumber(row.contract_value),
            latitude: coords ? coords.lat : null,
            longitude: coords ? coords.lng : null,
          })
          .select("id")
          .single();
        if (pErr || !created) {
          errors.push(`Proyek "${code}" gagal dibuat: ${pErr?.message ?? "tidak diketahui"}`);
          proj.skipped++;
          continue;
        }
        idx.byCode.set(code, created.id as string);
        idx.byName.set(normName(name), created.id as string);
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
