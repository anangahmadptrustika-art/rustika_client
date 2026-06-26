"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { STORAGE_BUCKETS } from "@/lib/constants";
import { r2GetUrl } from "@/lib/r2";
import {
  CLOUDINARY_ENABLED,
  cldResourceType,
  cldUploadParams,
  cldDownloadUrl,
  type CldUploadParams,
} from "@/lib/cloudinary";

function sanitize(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

// Server-side upload whitelist (Rule #8). Reject executables/scripts and
// script-capable formats (e.g. svg, html) — only allow known-safe types.
const ALLOWED_EXT: Record<"document" | "image", readonly string[]> = {
  document: [
    "pdf", "doc", "docx", "xls", "xlsx", "csv", "ppt", "pptx",
    "dwg", "dxf", "txt", "jpg", "jpeg", "png", "gif", "webp", "zip", "rar",
  ],
  image: ["jpg", "jpeg", "png", "gif", "webp"],
};

function extOf(name: string): string {
  const m = name.toLowerCase().match(/\.([a-z0-9]+)$/);
  return m ? m[1] : "";
}

/** Signed params so the browser uploads the file straight to Cloudinary. */
export async function createUploadParams(input: {
  kind: "document" | "image";
  projectId: string;
  category: string;
  filename: string;
}): Promise<({ ok: true } & CldUploadParams) | { ok: false; message: string }> {
  const profile = await getCurrentProfile();
  if (!can(profile?.role, "document:upload")) {
    return { ok: false, message: "Anda tidak memiliki izin mengunggah." };
  }
  if (!CLOUDINARY_ENABLED) {
    return { ok: false, message: "Penyimpanan file (Cloudinary) belum dikonfigurasi." };
  }
  const ext = extOf(input.filename);
  if (!ext || !ALLOWED_EXT[input.kind].includes(ext)) {
    return {
      ok: false,
      message: `Tipe file .${ext || "?"} tidak diizinkan. Diperbolehkan: ${ALLOWED_EXT[
        input.kind
      ].join(", ")}.`,
    };
  }
  const resourceType = cldResourceType(input.kind);
  const prefix = input.kind === "image" ? "i" : "d";
  let publicId = `rustika/${prefix}/${input.projectId}/${input.category}/${Date.now()}-${sanitize(
    input.filename
  )}`;
  // Image public_ids omit the extension (Cloudinary appends the delivered
  // format); raw (documents) keep it so the stored file stays intact.
  if (resourceType === "image") publicId = publicId.replace(/\.[^/.]+$/, "");
  return { ok: true, ...cldUploadParams(publicId, resourceType) };
}

/** Resolve a URL for a document, regardless of storage provider. */
export async function getDocumentUrl(
  documentId: string,
  download = false
): Promise<{ ok: boolean; url?: string; message?: string }> {
  const profile = await getCurrentProfile();
  if (!profile) return { ok: false, message: "Unauthorized" };

  const supabase = await createClient();
  const { data: doc } = await supabase
    .from("project_documents")
    .select("file_path, file_url, storage, name")
    .eq("id", documentId)
    .maybeSingle();
  if (!doc) return { ok: false, message: "Dokumen tidak ditemukan." };

  if (doc.storage === "cloudinary") {
    const url = (doc.file_url as string | null) || "";
    if (!url) return { ok: false, message: "Berkas tidak ditemukan." };
    return { ok: true, url: download ? cldDownloadUrl(url) : url };
  }
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
