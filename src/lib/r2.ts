import "server-only";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * Cloudflare R2 (S3-compatible) storage. Files live in R2 (free 10GB) while the
 * database, auth, and RLS stay on Supabase.
 *
 * Env (server only):
 *   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET
 */
export const R2_ENABLED =
  !!process.env.R2_ACCOUNT_ID &&
  !!process.env.R2_ACCESS_KEY_ID &&
  !!process.env.R2_SECRET_ACCESS_KEY &&
  !!process.env.R2_BUCKET;

const BUCKET = process.env.R2_BUCKET || "";

let _client: S3Client | null = null;
function client(): S3Client {
  if (!_client) {
    _client = new S3Client({
      region: "auto",
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
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
