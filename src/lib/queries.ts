/**
 * Server-side data access layer.
 *
 * Every function returns the same shape whether running in DEMO_MODE (seeded
 * sample data) or against a live Supabase project. Pages depend only on these
 * functions, so flipping to production data requires no page changes.
 */
import "server-only";
import { createClient } from "@/lib/supabase/server";
import { DEMO_MODE } from "@/lib/config";
import * as demo from "@/lib/demo-data";
import type {
  Activity,
  Approval,
  AreaData,
  Client,
  CommentWithAuthor,
  Invoice,
  Notification,
  Profile,
  Project,
  ProjectDocument,
  ProjectImage,
  ProjectProgress,
  ProjectWithRelations,
} from "@/types/database";
import { STORAGE_BUCKETS, type DocumentCategory } from "@/lib/constants";

async function sb() {
  return createClient();
}

// ── Notifications ────────────────────────────────────────────
export async function getNotifications(userId: string): Promise<Notification[]> {
  if (DEMO_MODE) return demo.demoNotifications;
  const supabase = await sb();
  const { data } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);
  return data ?? [];
}

// ── Clients ──────────────────────────────────────────────────
export async function getClients(): Promise<Client[]> {
  if (DEMO_MODE) return demo.demoClients;
  const supabase = await sb();
  const { data } = await supabase.from("clients").select("*").order("name");
  return data ?? [];
}

// ── Projects ─────────────────────────────────────────────────
export async function getProjects(): Promise<ProjectWithRelations[]> {
  if (DEMO_MODE) {
    return demo.demoProjects.map((p) => ({
      ...p,
      client: demo.demoClients.find((c) => c.id === p.client_id) ?? null,
      project_manager: p.project_manager_id ? demo.demoManager : null,
    }));
  }
  const supabase = await sb();
  const { data } = await supabase
    .from("projects")
    .select("*, client:clients(*), project_manager:profiles!projects_project_manager_id_fkey(*)")
    .order("created_at", { ascending: false });
  return (data as unknown as ProjectWithRelations[]) ?? [];
}

export async function getProjectById(
  id: string
): Promise<ProjectWithRelations | null> {
  if (DEMO_MODE) {
    const p = demo.getDemoProject(id);
    if (!p) return null;
    return {
      ...p,
      client: demo.demoClients.find((c) => c.id === p.client_id) ?? null,
      project_manager: demo.demoManager,
    };
  }
  const supabase = await sb();
  const { data } = await supabase
    .from("projects")
    .select("*, client:clients(*), project_manager:profiles!projects_project_manager_id_fkey(*)")
    .eq("id", id)
    .single();
  return (data as unknown as ProjectWithRelations) ?? null;
}

// ── Project-scoped collections ───────────────────────────────
export async function getProjectDocuments(
  projectId: string,
  category?: DocumentCategory
): Promise<ProjectDocument[]> {
  if (DEMO_MODE) {
    return demo.demoDocuments.filter(
      (d) => d.project_id === projectId && (!category || d.category === category)
    );
  }
  const supabase = await sb();
  let query = supabase
    .from("project_documents")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  if (category) query = query.eq("category", category);
  const { data } = await query;
  return data ?? [];
}

export async function getProjectImages(projectId: string): Promise<ProjectImage[]> {
  if (DEMO_MODE) return demo.demoImages.filter((i) => i.project_id === projectId);
  const supabase = await sb();
  const { data } = await supabase
    .from("project_images")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  const rows: ProjectImage[] = data ?? [];
  if (rows.length === 0) return rows;

  // Private bucket — generate short-lived signed URLs so images render.
  const { data: signed } = await supabase.storage
    .from(STORAGE_BUCKETS.images)
    .createSignedUrls(
      rows.map((r) => r.file_path),
      3600
    );
  const urlByPath = new Map(
    (signed ?? []).map((s) => [s.path, s.signedUrl] as const)
  );
  return rows.map((r) => ({
    ...r,
    file_url: urlByPath.get(r.file_path) ?? r.file_url,
  }));
}

export async function getProjectProgress(
  projectId: string
): Promise<ProjectProgress[]> {
  if (DEMO_MODE)
    return demo.demoProgress
      .filter((p) => p.project_id === projectId)
      .sort((a, b) => a.report_date.localeCompare(b.report_date));
  const supabase = await sb();
  const { data } = await supabase
    .from("project_progress")
    .select("*")
    .eq("project_id", projectId)
    .order("report_date", { ascending: true });
  return data ?? [];
}

export async function getAreaData(projectId: string): Promise<AreaData | null> {
  if (DEMO_MODE)
    return demo.demoAreaData.project_id === projectId ? demo.demoAreaData : null;
  const supabase = await sb();
  const { data } = await supabase
    .from("area_data")
    .select("*")
    .eq("project_id", projectId)
    .maybeSingle();
  return data ?? null;
}

export async function getInvoices(projectId?: string): Promise<Invoice[]> {
  if (DEMO_MODE)
    return projectId
      ? demo.demoInvoices.filter((i) => i.project_id === projectId)
      : demo.demoInvoices;
  const supabase = await sb();
  let query = supabase
    .from("invoices")
    .select("*")
    .order("issue_date", { ascending: false });
  if (projectId) query = query.eq("project_id", projectId);
  const { data } = await query;
  return data ?? [];
}

export async function getApprovals(projectId: string): Promise<Approval[]> {
  if (DEMO_MODE) return demo.demoApprovals.filter((a) => a.project_id === projectId);
  const supabase = await sb();
  const { data } = await supabase
    .from("approvals")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function getComments(projectId: string): Promise<CommentWithAuthor[]> {
  if (DEMO_MODE) return demo.demoComments.filter((c) => c.project_id === projectId);
  const supabase = await sb();
  const { data } = await supabase
    .from("comments")
    .select("*, author:profiles(*)")
    .eq("project_id", projectId)
    .is("parent_id", null)
    .order("created_at", { ascending: true });
  return (data as unknown as CommentWithAuthor[]) ?? [];
}

export async function getActivities(projectId?: string): Promise<Activity[]> {
  if (DEMO_MODE)
    return projectId
      ? demo.demoActivities.filter((a) => a.project_id === projectId)
      : demo.demoActivities;
  const supabase = await sb();
  let query = supabase
    .from("activities")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);
  if (projectId) query = query.eq("project_id", projectId);
  const { data } = await query;
  return data ?? [];
}

// ── Global document feed (across projects) ───────────────────
export interface DocumentWithProject extends ProjectDocument {
  project_name?: string;
}

export async function getAllDocuments(): Promise<DocumentWithProject[]> {
  if (DEMO_MODE) {
    return demo.demoDocuments.map((d) => ({
      ...d,
      project_name: demo.getDemoProject(d.project_id)?.name,
    }));
  }
  const supabase = await sb();
  const { data } = await supabase
    .from("project_documents")
    .select("*, project:projects(name)")
    .order("created_at", { ascending: false })
    .limit(100);
  return (
    (data as unknown as (ProjectDocument & { project?: { name: string } })[]) ?? []
  ).map((d) => ({ ...d, project_name: d.project?.name }));
}

// ── Profiles / team ──────────────────────────────────────────
export async function getProfiles(): Promise<Profile[]> {
  if (DEMO_MODE)
    return [demo.demoProfile, demo.demoManager];
  const supabase = await sb();
  const { data } = await supabase.from("profiles").select("*").order("full_name");
  return data ?? [];
}

// ── Dashboard aggregates ─────────────────────────────────────
export interface DashboardStats {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  averageProgress: number;
  pendingApproval: number;
  outstandingInvoice: number;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const projects = await getProjects();
  const invoices = await getInvoices();

  const completed = projects.filter((p) => p.status === "completed").length;
  const active = projects.filter(
    (p) => p.status !== "completed" && p.status !== "on_hold"
  ).length;
  const avg =
    projects.length > 0
      ? Math.round(
          (projects.reduce((sum, p) => sum + Number(p.progress ?? 0), 0) /
            projects.length) *
            100
        ) / 100
      : 0;

  const outstanding = invoices
    .filter((i) => i.status === "sent" || i.status === "overdue")
    .reduce((sum, i) => sum + Number(i.amount), 0);

  // Pending approvals across demo projects.
  let pending = 0;
  if (DEMO_MODE) {
    pending = demo.demoApprovals.filter((a) => a.status === "pending").length;
  } else {
    const supabase = await sb();
    const { count } = await supabase
      .from("approvals")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending");
    pending = count ?? 0;
  }

  return {
    totalProjects: projects.length,
    activeProjects: active,
    completedProjects: completed,
    averageProgress: avg,
    pendingApproval: pending,
    outstandingInvoice: outstanding,
  };
}

// ── Progress analytics (dashboard charts from real data) ─────
export interface ProgressAnalytics {
  monthly: { month: string; progress: number }[];
  divisions: { division: string; progress: number }[];
}

const MONTH_ID = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];

export async function getProgressAnalytics(): Promise<ProgressAnalytics> {
  if (DEMO_MODE) {
    return { monthly: demo.demoMonthlyProgress, divisions: demo.demoDivisionProgress };
  }

  const supabase = await sb();
  const { data } = await supabase
    .from("project_progress")
    .select("report_date, progress_percent, division");
  const rows: { report_date: string; progress_percent: number; division: string | null }[] =
    data ?? [];

  // Last 6 calendar months — average of progress reports per month.
  const now = new Date();
  const buckets: { key: string; label: string }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: MONTH_ID[d.getMonth()] });
  }
  const monthly = buckets.map((b) => {
    const vals = rows
      .filter((r) => {
        const d = new Date(r.report_date);
        return `${d.getFullYear()}-${d.getMonth()}` === b.key;
      })
      .map((r) => Number(r.progress_percent));
    const avg = vals.length ? Math.round(vals.reduce((a, c) => a + c, 0) / vals.length) : 0;
    return { month: b.label, progress: avg };
  });

  // Average progress per division.
  const byDivision = new Map<string, number[]>();
  for (const r of rows) {
    if (!r.division) continue;
    const arr = byDivision.get(r.division) ?? [];
    arr.push(Number(r.progress_percent));
    byDivision.set(r.division, arr);
  }
  const divisions = Array.from(byDivision.entries()).map(([division, vals]) => ({
    division,
    progress: Math.round(vals.reduce((a, c) => a + c, 0) / vals.length),
  }));

  return { monthly, divisions };
}

// ── Global search ────────────────────────────────────────────
export interface SearchResults {
  projects: Project[];
  documents: ProjectDocument[];
  clients: Client[];
  invoices: Invoice[];
}

export async function globalSearch(query: string): Promise<SearchResults> {
  const q = query.toLowerCase().trim();
  if (!q) return { projects: [], documents: [], clients: [], invoices: [] };

  if (DEMO_MODE) {
    return {
      projects: demo.demoProjects.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.code.toLowerCase().includes(q) ||
          (p.location ?? "").toLowerCase().includes(q)
      ),
      documents: demo.demoDocuments.filter((d) =>
        d.name.toLowerCase().includes(q)
      ),
      clients: demo.demoClients.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.company ?? "").toLowerCase().includes(q)
      ),
      invoices: demo.demoInvoices.filter((i) =>
        i.invoice_number.toLowerCase().includes(q)
      ),
    };
  }

  const supabase = await sb();
  const [projects, documents, clients, invoices] = await Promise.all([
    supabase.from("projects").select("*").or(
      `name.ilike.%${q}%,code.ilike.%${q}%,location.ilike.%${q}%`
    ).limit(10),
    supabase.from("project_documents").select("*").ilike("name", `%${q}%`).limit(10),
    supabase.from("clients").select("*").or(`name.ilike.%${q}%,company.ilike.%${q}%`).limit(10),
    supabase.from("invoices").select("*").ilike("invoice_number", `%${q}%`).limit(10),
  ]);

  return {
    projects: projects.data ?? [],
    documents: documents.data ?? [],
    clients: clients.data ?? [],
    invoices: invoices.data ?? [],
  };
}
