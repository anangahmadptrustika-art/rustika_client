import "server-only";
import crypto from "node:crypto";

/**
 * Cloudinary storage for uploaded files (documents & photos). The browser
 * uploads straight to Cloudinary using a server-generated signature — the API
 * secret never reaches the browser, and no CORS configuration is needed because
 * Cloudinary's upload endpoint is CORS-friendly. The database, auth, and RLS
 * stay on Supabase.
 *
 * Env (server only):
 *   CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
 */
export const CLOUDINARY_ENABLED =
  !!process.env.CLOUDINARY_CLOUD_NAME &&
  !!process.env.CLOUDINARY_API_KEY &&
  !!process.env.CLOUDINARY_API_SECRET;

const CLOUD = process.env.CLOUDINARY_CLOUD_NAME || "";
const KEY = process.env.CLOUDINARY_API_KEY || "";
const SECRET = process.env.CLOUDINARY_API_SECRET || "";

export type StorageKind = "document" | "image";
export type CldResourceType = "image" | "raw";

/** Images use the "image" pipeline; documents (PDF, etc.) are stored as "raw". */
export function cldResourceType(kind: StorageKind): CldResourceType {
  return kind === "image" ? "image" : "raw";
}

/** Cloudinary signature: sorted `key=value` joined by `&`, then the API secret, SHA-1 hex. */
function sign(params: Record<string, string | number>): string {
  const toSign = Object.keys(params)
    .filter((k) => params[k] !== undefined && params[k] !== "")
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return crypto.createHash("sha1").update(toSign + SECRET).digest("hex");
}

export interface CldUploadParams {
  uploadUrl: string;
  apiKey: string;
  timestamp: number;
  publicId: string;
  signature: string;
  resourceType: CldResourceType;
}

/** Build the signed fields the browser posts straight to Cloudinary. */
export function cldUploadParams(
  publicId: string,
  resourceType: CldResourceType
): CldUploadParams {
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = sign({ public_id: publicId, timestamp });
  return {
    uploadUrl: `https://api.cloudinary.com/v1_1/${CLOUD}/${resourceType}/upload`,
    apiKey: KEY,
    timestamp,
    publicId,
    signature,
    resourceType,
  };
}

/** Force-download variant of a stored delivery URL. */
export function cldDownloadUrl(secureUrl: string): string {
  return secureUrl.includes("/upload/")
    ? secureUrl.replace("/upload/", "/upload/fl_attachment/")
    : secureUrl;
}

/** Delete an asset by public_id (server-side, signed). Best-effort. */
export async function cldDelete(
  publicId: string,
  resourceType: CldResourceType
): Promise<void> {
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = sign({ public_id: publicId, timestamp });
  const body = new URLSearchParams({
    public_id: publicId,
    timestamp: String(timestamp),
    api_key: KEY,
    signature,
  });
  await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/${resourceType}/destroy`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
}

/** Download object bytes (used by the AI document analysis). SSRF guard: only
 * https Cloudinary hosts are fetched, since file_url originates client-side. */
export async function cldGetBytes(url: string): Promise<Buffer> {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    throw new Error("Invalid file URL");
  }
  if (u.protocol !== "https:" || !/(^|\.)cloudinary\.com$/i.test(u.hostname)) {
    throw new Error("Refused: file URL is not a Cloudinary https URL");
  }
  const res = await fetch(u.toString());
  if (!res.ok) throw new Error(`Cloudinary fetch failed: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}
