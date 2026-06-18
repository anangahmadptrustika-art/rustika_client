import "server-only";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * S3-compatible object storage for uploaded files (documents & photos) while
 * the database, auth, and RLS stay on Supabase.
 *
 * Works with any S3-compatible provider:
 *   - Backblaze B2  — 10 GB free, NO credit card for private buckets
 *   - Cloudflare R2 — 10 GB free (requires a card on file)
 *
 * Env (server only):
 *   R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET   (required)
 *   and ONE of the following to locate the endpoint:
 *     S3_ENDPOINT   — full endpoint URL. Backblaze B2 example:
 *                     https://s3.us-west-004.backblazeb2.com
 *     R2_ACCOUNT_ID — Cloudflare R2 account id (endpoint derived automatically)
 *   S3_REGION (optional) — signing region; auto-derived for B2, else "auto".
 */
const ENDPOINT =
  process.env.S3_ENDPOINT ||
  (process.env.R2_ACCOUNT_ID
    ? `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
    : "");

/** Backblaze B2 signs requests with the region embedded in its endpoint host. */
function deriveRegion(endpoint: string): string {
  const m = endpoint.match(/s3\.([a-z0-9-]+)\.backblazeb2\.com/i);
  return m ? m[1] : "auto";
}
const REGION = process.env.S3_REGION || deriveRegion(ENDPOINT);

export const R2_ENABLED =
  !!ENDPOINT &&
  !!process.env.R2_ACCESS_KEY_ID &&
  !!process.env.R2_SECRET_ACCESS_KEY &&
  !!process.env.R2_BUCKET;

const BUCKET = process.env.R2_BUCKET || "";

let _client: S3Client | null = null;
function client(): S3Client {
  if (!_client) {
    _client = new S3Client({
      region: REGION,
      endpoint: ENDPOINT,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    });
  }
  return _client;
}

/** Presigned PUT URL for direct browser → R2 upload. */
export async function r2PutUrl(key: string, contentType: string, expiresIn = 600) {
  return getSignedUrl(
    client(),
    new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: contentType }),
    { expiresIn }
  );
}

/** Presigned GET URL for download/preview. */
export async function r2GetUrl(
  key: string,
  opts: { download?: boolean; filename?: string; expiresIn?: number } = {}
) {
  const { download, filename, expiresIn = 3600 } = opts;
  return getSignedUrl(
    client(),
    new GetObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ...(download
        ? {
            ResponseContentDisposition: `attachment${
              filename ? `; filename="${filename.replace(/"/g, "")}"` : ""
            }`,
          }
        : {}),
    }),
    { expiresIn }
  );
}

/** Signed GET URLs for many keys at once. */
export async function r2GetUrls(keys: string[]) {
  const entries = await Promise.all(
    keys.map(async (k) => [k, await r2GetUrl(k)] as const)
  );
  return new Map(entries);
}

export async function r2Delete(key: string) {
  await client().send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}

/** Download object bytes (used by the AI document analysis). */
export async function r2GetBytes(key: string): Promise<Buffer> {
  const res = await client().send(
    new GetObjectCommand({ Bucket: BUCKET, Key: key })
  );
  const bytes = await res.Body!.transformToByteArray();
  return Buffer.from(bytes);
}
