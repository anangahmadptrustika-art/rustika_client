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

  const [docsRes, imgsRes, progRes, areaRes, invRes] = await Promise.all([
    admin
      .from("project_documents")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false }),
    admin
      .from("project_images")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false }),
    admin
      .from("project_progress")
      .select("*")
      .eq("project_id", projectId)
      .order("report_date", { ascending: true }),
    admin.from("area_data").select("*").eq("project_id", projectId).maybeSingle(),
    admin
      .from("invoices")
      .select("*")
      .eq("project_id", projectId)
      .order("issue_date", { ascending: false }),
  ]);

  const documents = await signDocuments(admin, (docsRes.data as ProjectDocument[]) ?? []);
  const images = await signImages(admin, (imgsRes.data as ProjectImage[]) ?? []);

  return {
    project: project as Project,
    documents,
    images,
    progress: (progRes.data as ProjectProgress[]) ?? [],
    area: (areaRes.data as AreaData) ?? null,
    invoices: (invRes.data as Invoice[]) ?? [],
  };
}

type Admin = ReturnType<typeof createAdminClient>;

type SignedUrl = { path: string | null; signedUrl: string };

async function signDocuments(admin: Admin, docs: ProjectDocument[]) {
  if (docs.length === 0) return docs;
  const { data } = await admin.storage
    .from(STORAGE_BUCKETS.documents)
    .createSignedUrls(docs.map((d) => d.file_path), 3600);
  const map = new Map(
    ((data ?? []) as SignedUrl[]).map((s) => [s.path, s.signedUrl] as const)
  );
  return docs.map((d) => ({ ...d, file_url: map.get(d.file_path) ?? null }));
}

async function signImages(admin: Admin, imgs: ProjectImage[]) {
  if (imgs.length === 0) return imgs;
  const { data } = await admin.storage
    .from(STORAGE_BUCKETS.images)
    .createSignedUrls(imgs.map((i) => i.file_path), 3600);
  const map = new Map(
    ((data ?? []) as SignedUrl[]).map((s) => [s.path, s.signedUrl] as const)
  );
  return imgs.map((i) => ({ ...i, file_url: map.get(i.file_path) ?? i.file_url }));
}
