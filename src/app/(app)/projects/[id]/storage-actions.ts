"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { STORAGE_BUCKETS } from "@/lib/constants";
import { R2_ENABLED, r2GetUrl, r2PutUrl } from "@/lib/r2";

function sanitize(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

/** Presigned PUT URL so the browser uploads the file straight to R2. */
export async function createUploadUrl(input: {
  kind: "document" | "image";
  projectId: string;
  category: string;
  filename: string;
  contentType: string;
}): Promise<{ ok: boolean; url?: string; key?: string; message?: string }> {
  const profile = await getCurrentProfile();
  if (!can(profile?.role, "document:upload")) {
    return { ok: false, message: "Anda tidak memiliki izin mengunggah." };
  }
  if (!R2_ENABLED) {
    return { ok: false, message: "Penyimpanan file (R2) belum dikonfigurasi." };
  }
  const prefix = input.kind === "image" ? "i" : "d";
  const key = `${prefix}/${input.projectId}/${input.category}/${Date.now()}-${sanitize(
    input.filename
  )}`;
  const url = await r2PutUrl(key, input.contentType || "application/octet-stream");
  return { ok: true, url, key };
}

/** Resolve a short-lived URL for a document, regardless of storage provider. */
export async function getDocumentUrl(
  documentId: string,
  download = false
): Promise<{ ok: boolean; url?: string; message?: string }> {
  const profile = await getCurrentProfile();
  if (!profile) return { ok: false, message: "Unauthorized" };

  const supabase = await createClient();
  const { data: doc } = await supabase
    .from("project_documents")
    .select("file_path, storage, name")
    .eq("id", documentId)
    .maybeSingle();
  if (!doc) return { ok: false, message: "Dokumen tidak ditemukan." };

  if (doc.storage === "r2") {
    const url = await r2GetUrl(doc.file_path, { download, filename: doc.name });
    return { ok: true, url };
  }
  const { data } = await supabase.storage
    .from(STORAGE_BUCKETS.documents)
    .createSignedUrl(doc.file_path, 300, download ? { download: true } : undefined);
  return data?.signedUrl
    ? { ok: true, url: data.signedUrl }
    : { ok: false, message: "Gagal membuat link unduhan." };
}
