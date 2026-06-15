/**
 * Public Client Portal data layer.
 *
 * The portal is accessed without login via a secret per-client token. There is
 * no authenticated user, so RLS (auth.uid()) cannot scope the data — instead we
 * use the service-role client and STRICTLY filter every query by the client id
 * resolved from the token. Files are exposed via short-lived signed URLs.
 */
import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import { STORAGE_BUCKETS } from "@/lib/constants";
import type {
  AreaData,
  Client,
  Invoice,
  Project,
  ProjectDocument,
  ProjectImage,
  ProjectProgress,
} from "@/types/database";

export async function getClientByToken(token: string): Promise<Client | null> {
  if (!token) return null;
  const admin = createAdminClient();
  const { data } = await admin
    .from("clients")
    .select("*")
    .eq("share_token", token)
    .maybeSingle();
  return (data as Client) ?? null;
}

export async function getPortalProjects(clientId: string): Promise<Project[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("projects")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });
  return (data as Project[]) ?? [];
}

export interface PortalProjectBundle {
  project: Project;
  documents: ProjectDocument[];
  images: ProjectImage[];
  progress: ProjectProgress[];
  area: AreaData | null;
  invoices: Invoice[];
}

/**
 * Returns everything a client may see for a project — but only if that project
 * belongs to the client (defense against token holders guessing project ids).
 * Every sub-query is isolated so a single failure never crashes the portal.
 */
export async function getPortalProjectBundle(
  clientId: string,
  projectId: string
): Promise<PortalProjectBundle | null> {
  const admin = createAdminClient();

  const { data: project } = await admin
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .eq("client_id", clientId)
    .maybeSingle();
  if (!project) return null;

  const safe = async <T>(
    query: PromiseLike<{ data: unknown }>,
    fallback: T
  ): Promise<T> => {
    try {
      const { data } = await query;
      return (data as T) ?? fallback;
    } catch {
      return fallback;
    }
  };

  const [docs, imgs, progress, area, invoices] = await Promise.all([
    safe<ProjectDocument[]>(
      admin
        .from("project_documents")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false }),
      []
    ),
    safe<ProjectImage[]>(
      admin
        .from("project_images")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false }),
      []
    ),
    safe<ProjectProgress[]>(
      admin
        .from("project_progress")
        .select("*")
        .eq("project_id", projectId)
        .order("report_date", { ascending: true }),
      []
    ),
    safe<AreaData | null>(
      admin.from("area_data").select("*").eq("project_id", projectId).maybeSingle(),
      null
    ),
    safe<Invoice[]>(
      admin
        .from("invoices")
        .select("*")
        .eq("project_id", projectId)
        .order("issue_date", { ascending: false }),
      []
    ),
  ]);

  const documents = await signDocuments(admin, docs);
  const images = await signImages(admin, imgs);

  return {
    project: project as Project,
    documents,
    images,
    progress,
    area,
    invoices,
  };
}

type Admin = ReturnType<typeof createAdminClient>;
type SignedUrl = { path: string | null; signedUrl: string };

async function signDocuments(admin: Admin, docs: ProjectDocument[]) {
  if (docs.length === 0) return docs;
  try {
    const { data } = await admin.storage
      .from(STORAGE_BUCKETS.documents)
      .createSignedUrls(docs.map((d) => d.file_path), 3600);
    const map = new Map(
      ((data ?? []) as SignedUrl[]).map((s) => [s.path, s.signedUrl] as const)
    );
    return docs.map((d) => ({ ...d, file_url: map.get(d.file_path) ?? null }));
  } catch {
    return docs.map((d) => ({ ...d, file_url: null }));
  }
}

async function signImages(admin: Admin, imgs: ProjectImage[]) {
  if (imgs.length === 0) return imgs;
  try {
    const { data } = await admin.storage
      .from(STORAGE_BUCKETS.images)
      .createSignedUrls(imgs.map((i) => i.file_path), 3600);
    const map = new Map(
      ((data ?? []) as SignedUrl[]).map((s) => [s.path, s.signedUrl] as const)
    );
    return imgs.map((i) => ({ ...i, file_url: map.get(i.file_path) ?? i.file_url }));
  } catch {
    return imgs.map((i) => ({ ...i, file_url: i.file_url }));
  }
}
