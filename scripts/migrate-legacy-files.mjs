// Pindahkan file LAMA dari Supabase Storage → Cloudinary, lalu perbarui baris
// project_documents / project_images di database lokal (storage = 'cloudinary').
// Dijalankan di dalam container app oleh scripts/migrate-legacy-files.sh
// (Node 22, tanpa dependensi). Env yang dipakai:
//   SUPABASE_INTERNAL_URL, SUPABASE_SERVICE_ROLE_KEY      (database lokal)
//   CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
//   CLOUD_SUPABASE_URL, CLOUD_SERVICE_KEY                 (project Supabase lama)
import { createHash } from "node:crypto";

const need = (k) => {
  const v = process.env[k];
  if (!v) {
    console.error(`env ${k} kosong`);
    process.exit(2);
  }
  return v;
};
const LOCAL = need("SUPABASE_INTERNAL_URL").replace(/\/$/, "");
const LOCAL_KEY = need("SUPABASE_SERVICE_ROLE_KEY");
const CLOUD = need("CLOUD_SUPABASE_URL").replace(/\/$/, "");
const CLOUD_KEY = need("CLOUD_SERVICE_KEY");
const CLD_NAME = need("CLOUDINARY_CLOUD_NAME");
const CLD_KEY = need("CLOUDINARY_API_KEY");
const CLD_SECRET = need("CLOUDINARY_API_SECRET");
const DRY = process.env.DRY_RUN === "1";

if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(CLOUD)) {
  console.error("CLOUD_SUPABASE_URL harus https://<ref>.supabase.co");
  process.exit(2);
}

const TABLES = [
  { table: "project_documents", bucket: "project-documents", kind: "document", prefix: "d" },
  { table: "project_images", bucket: "project-images", kind: "image", prefix: "i" },
];

const localHeaders = {
  apikey: LOCAL_KEY,
  Authorization: `Bearer ${LOCAL_KEY}`,
  "Content-Type": "application/json",
};

async function listLegacy(table) {
  const rows = [];
  for (let offset = 0; ; offset += 500) {
    const url =
      `${LOCAL}/rest/v1/${table}?select=id,project_id,category,file_path,storage` +
      `&storage=not.in.(cloudinary,r2)&order=id&limit=500&offset=${offset}`;
    const r = await fetch(url, { headers: localHeaders });
    if (!r.ok) throw new Error(`REST ${table}: HTTP ${r.status} ${await r.text()}`);
    const page = await r.json();
    rows.push(...page);
    if (page.length < 500) break;
  }
  return rows;
}

async function download(bucket, path) {
  const enc = path.split("/").map(encodeURIComponent).join("/");
  const r = await fetch(`${CLOUD}/storage/v1/object/${bucket}/${enc}`, {
    headers: { apikey: CLOUD_KEY, Authorization: `Bearer ${CLOUD_KEY}` },
  });
  if (r.status === 404 || r.status === 400) return null;
  if (!r.ok) throw new Error(`download HTTP ${r.status}`);
  return Buffer.from(await r.arrayBuffer());
}

const sanitize = (s) => s.replace(/[^a-zA-Z0-9._-]/g, "_");

async function uploadCloudinary(bytes, publicId, resourceType, filename) {
  const timestamp = Math.floor(Date.now() / 1000);
  const toSign = `public_id=${publicId}&timestamp=${timestamp}`;
  const signature = createHash("sha1").update(toSign + CLD_SECRET).digest("hex");
  const form = new FormData();
  form.append("file", new Blob([bytes]), filename);
  form.append("api_key", CLD_KEY);
  form.append("timestamp", String(timestamp));
  form.append("public_id", publicId);
  form.append("signature", signature);
  const r = await fetch(`https://api.cloudinary.com/v1_1/${CLD_NAME}/${resourceType}/upload`, {
    method: "POST",
    body: form,
  });
  if (!r.ok) throw new Error(`cloudinary HTTP ${r.status} ${await r.text()}`);
  return r.json();
}

async function patchRow(table, id, body) {
  const r = await fetch(`${LOCAL}/rest/v1/${table}?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { ...localHeaders, Prefer: "return=minimal" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`update HTTP ${r.status} ${await r.text()}`);
}

let moved = 0,
  missing = 0,
  failed = 0;
for (const t of TABLES) {
  const rows = await listLegacy(t.table);
  console.log(`\n${t.table}: ${rows.length} file lama`);
  for (const row of rows) {
    const label = `${t.table}/${row.id} (${row.file_path})`;
    try {
      const bytes = await download(t.bucket, row.file_path);
      if (!bytes) {
        missing++;
        console.log(`  - ${label}: TIDAK ADA di Supabase Storage (dilewati)`);
        continue;
      }
      const base = row.file_path.split("/").pop() || "file";
      const resourceType = t.kind === "image" ? "image" : "raw";
      let publicId = `rustika/${t.prefix}/${row.project_id}/${row.category || "other"}/${Date.now()}-${sanitize(base)}`;
      if (resourceType === "image") publicId = publicId.replace(/\.[^/.]+$/, "");
      if (DRY) {
        console.log(`  · ${label}: ${bytes.length} byte → (dry-run) ${publicId}`);
        continue;
      }
      const up = await uploadCloudinary(bytes, publicId, resourceType, base);
      await patchRow(t.table, row.id, {
        storage: "cloudinary",
        file_path: up.public_id,
        file_url: up.secure_url,
      });
      moved++;
      console.log(`  ✔ ${label}: ${bytes.length} byte → Cloudinary`);
    } catch (e) {
      failed++;
      console.log(`  ✖ ${label}: ${e.message}`);
    }
  }
}
console.log(`\nSelesai: dipindah ${moved}, tidak ada di sumber ${missing}, gagal ${failed}`);
process.exit(failed ? 1 : 0);
