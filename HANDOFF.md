# HANDOFF — CLIENT RUSTIKA CONSULTANT

Dokumen serah-terima untuk melanjutkan pengembangan di sesi/chat baru.
Tanggal update: 2026-06-18.

---

## 1. Ringkasan Produk

**Client Rustika Consultant** — portal manajemen proyek (Next.js 15 + Supabase
+ Vercel) untuk PT Rustika Global Indonesia. Mengelola proyek konsultan
(arsitektur, sipil, survey, drone, kajian teknis, SIMBG) + **portal client
publik via QR (tanpa login)**.

- **Live (Production):** https://rustika-client.vercel.app
- **Repo:** `anangahmadptrustika-art/rustika_client`
- **Branch kerja:** `claude/busy-curie-6ao846` **dan** `main` (di-sync; lihat §4)
- **Hosting:** Vercel (project `rustika-client`)
- **Database/Auth:** Supabase project `jbtwezqjnvchzpefvzyh` (region **Sydney**), Free plan
- **File storage:** sedang migrasi ke **Cloudflare R2** (lihat §6 — SETUP BELUM SELESAI)

---

## 2. Tech Stack

Next.js 15 App Router · TypeScript · Tailwind 3 · Shadcn UI (Radix) ·
Framer Motion · Recharts · Supabase (Postgres + Auth + RLS) ·
Cloudflare R2 (file storage, S3-compatible) · Anthropic Claude (AI) ·
qrcode.react · browser-image-compression · @aws-sdk/client-s3.

---

## 3. Environment Variables (di Vercel → Settings → Env, Production)

| Var | Nilai | Status |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://jbtwezqjnvchzpefvzyh.supabase.co` | ✅ terpasang |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key (eyJ…) | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key (eyJ…) | ✅ |
| `NEXT_PUBLIC_SITE_URL` | `https://rustika-client.vercel.app` | ✅ |
| `ANTHROPIC_API_KEY` | sk-ant-… | ⏳ untuk AI (belum dikonfirmasi terpasang) |
| `ANTHROPIC_MODEL` | `claude-sonnet-4-6` | opsional |
| `R2_ACCOUNT_ID` | Cloudflare account id | ⏳ BELUM |
| `R2_ACCESS_KEY_ID` | R2 token | ⏳ BELUM |
| `R2_SECRET_ACCESS_KEY` | R2 secret | ⏳ BELUM |
| `R2_BUCKET` | mis. `rustika-files` | ⏳ BELUM |

> Tanpa env Supabase → app jalan DEMO_MODE (data contoh). `R2_ENABLED` aktif bila ke-4 var R2 terisi.

---

## 4. Workflow Deploy (PENTING)

- Vercel **Production Branch = `main`**. Setiap commit harus di-push ke **DUA**
  branch: `claude/busy-curie-6ao846` (branch kerja) **dan** `main` (memicu
  deploy production). Perintah yang dipakai selama ini:
  ```
  git push origin HEAD:claude/busy-curie-6ao846
  git push origin HEAD:main
  ```
- PR #1 sudah merged di awal (main awalnya empty commit, lalu di-rebase).
- **Function Region** Vercel di-set ke **`syd1` (Sydney)** via `vercel.json`
  agar dekat DB. ⚠️ User perlu pastikan ini aktif di project `rustika-client`
  (bukan project lain bernama "ai-agen-…").

---

## 5. Status Migrasi SQL (dijalankan manual di Supabase SQL Editor)

| File migrasi | Isi | Status |
| --- | --- | --- |
| `0001_schema.sql` | tabel, enum, index, trigger | ✅ dijalankan |
| `0002_rls.sql` | Row Level Security | ✅ |
| `0003_storage.sql` | bucket Supabase Storage | ✅ |
| `0004_portal.sql` | `clients.share_token` (QR portal) | ✅ |
| `0005_progress_decimal.sql` | progress → numeric(5,2) | ✅ (progress tampil 2 desimal) |
| `0006_status_values.sql` | status enum → text + mapping | ✅ |
| `seed-vale-progress.sql` | progres proyek VALE dari PDF rekap | ✅ (45 proyek terisi) |
| `0007_r2_storage.sql` | kolom `storage` di documents/images | ⏳ **BELUM dijalankan** |

SQL 0007 yang harus dijalankan:
```sql
alter table public.project_documents add column if not exists storage text not null default 'supabase';
alter table public.project_images   add column if not exists storage text not null default 'supabase';
```

---

## 6. ⚠️ TUGAS BERIKUTNYA (PRIORITAS) — Selesaikan migrasi Cloudflare R2

**Masalah:** Supabase Storage Free plan **over limit (1,2 GB / 1 GB = 120%)**.
Hanya STORAGE yang penuh (DB 6%, egress 29% — aman). Solusi yang dipilih user:
pindah FILE ke **Cloudflare R2 (gratis 10 GB)**, DB/Auth tetap di Supabase.

**Kode R2 sudah selesai & ter-deploy.** Yang tinggal dilakukan USER:
1. Buat akun Cloudflare → R2 → **Create bucket** `rustika-files`.
2. **Manage R2 API Tokens** → Object Read & Write → catat Access Key ID,
   Secret Access Key, Account ID.
3. Bucket → **Settings → CORS** → izinkan origin `https://rustika-client.vercel.app`
   (+ domain Hostinger nanti), methods GET & PUT.
4. Isi 4 env var R2 di Vercel (lihat §3) → **Redeploy**.
5. Jalankan **SQL 0007** (lihat §5).

**Setelah aktif:** upload baru → R2 (`storage='r2'`); file lama tetap kebaca
dari Supabase (`storage='supabase'`). Batas upload 50 MB Supabase tidak berlaku
lagi → bisa naikkan `MAX_UPLOAD_MB` di `src/lib/constants.ts`.
Lalu hapus file lama di Supabase agar < 1 GB (pakai tombol Hapus di app).

---

## 7. Arsitektur File Penting

```
src/
  app/
    (app)/                      # area login (sidebar+header, fixed shell)
      layout.tsx                # shell: sidebar fixed, main scroll
      template.tsx              # animasi transisi halaman (framer)
      dashboard/page.tsx        # stat cards + chart (data asli)
      projects/
        page.tsx                # list di-GROUP per client, toolbar fixed
        actions.ts              # create/update/delete project (+parseProjectForm)
        [id]/
          page.tsx              # detail 12 tab (fetch 1 batch paralel)
          actions.ts            # progress, invoice, area, approval, comment, deleteDoc/Image
          storage-actions.ts    # createUploadUrl (R2 presigned PUT) + getDocumentUrl
      clients/ (page+actions)   # CRUD client + QR portal + delete
      users/ (page+actions)     # buat user (admin service-role)
      documents/ invoices/ notifications/ search/ settings/ assistant/
    api/assistant/route.ts      # AI Claude + analisa dokumen (PDF/gambar)
    portal/[token]/             # PORTAL CLIENT publik (tanpa login)
      layout.tsx page.tsx p/[projectId]/page.tsx error.tsx template.tsx
    login/ (page+actions) auth/callback/ page.tsx(landing) layout.tsx not-found.tsx
  components/
    ui/*                        # shadcn primitives
    layout/* projects/* clients/* portal/* charts/* shared/* assistant/* motion/* brand/*
  lib/
    supabase/{client,server,middleware}.ts
    r2.ts                       # Cloudflare R2 (presigned put/get, delete, getBytes)
    queries.ts                  # data-access (demo ⇄ live), getProjectImages sign per-storage
    portal.ts                   # data portal (admin client, sign per-storage)
    constants.ts                # status(7), kategori, MAX_UPLOAD_MB, dll
    rbac.ts auth.ts activity.ts file-kind.ts config.ts utils.ts demo-data.ts navigation.ts
  middleware.ts
  types/database.ts             # tipe DB (ada field `storage`)
public/logo.png                 # logo brand (di-upload user)
supabase/migrations/*.sql       supabase/seed*.sql
vercel.json                     # regions: ["syd1"]
docs/ (ARCHITECTURE, DATABASE, DEPLOYMENT, ROLES)
```

---

## 8. Fitur yang Sudah Jadi (semua live)

- **Auth & RBAC**: 4 peran (super_admin, project_manager, staff, client) + RLS.
- **Dashboard**: 6 stat card + 3 chart (data asli), empty states.
- **Projek**: di-group per client (collapsible), toolbar/search **fixed**,
  hanya list yang scroll. CRUD penuh (buat/edit/hapus). **7 status**:
  PBG, SLF, PBG UNDER CONSTRUCTION, SLF UNDER CONSTRUCTION, CONSTRUCTION,
  DESIGN, SUPERVISI.
- **Detail proyek (12 tab)**: Overview, Kajian Teknis, SIMBG, Survey, Drone,
  Capture Images, Data Luasan, Progress Report, Timeline, Invoice, Approval,
  Discussion.
- **Upload**: multi-file sekaligus, foto auto-kompresi, progress bar, validasi
  ukuran. **Preview & hapus** file (PDF inline, gambar lightbox).
- **Form input**: Progress Report (+timeline otomatis), Invoice, Data Luasan.
- **Angka 2 desimal**: harga & luasan & progress.
- **Client + QR Portal**: tiap client punya `share_token` → link/QR → portal
  publik (folder collapsible, preview PDF/JPG, tanpa login). Tombol "QR Portal"
  & "Hapus" di kartu client.
- **Users**: super_admin bisa buat akun (staff/PM/client) via service-role.
- **AI Assistant**: Anthropic Claude + **analisa dokumen** (lampirkan PDF/gambar
  → ringkas/ekstrak). Fallback "mode demo" bila `ANTHROPIC_API_KEY` kosong.
- **Branding**: logo Rustika (`public/logo.png`) + favicon, wordmark "RUSTIKA
  CONSULTANT".
- **Animasi profesional** (Framer Motion).
- **Performa**: function region syd1 + query detail proyek dibatch paralel.
- **Timeline otomatis**: aktivitas tercatat saat upload/progress/invoice/
  approval/comment/hapus.

---

## 9. Hal yang Masih Bisa Dikerjakan / Diketahui

1. **R2 setup** (§6) — paling prioritas, agar storage Supabase tidak over.
2. **Hapus file lama di Supabase** agar < 1 GB setelah R2 aktif.
3. **AI**: konfirmasi `ANTHROPIC_API_KEY` terpasang (badge "Live (Claude)").
4. **Domain Hostinger**: arahkan ke Vercel (Vercel → Domains → Add → set DNS
   di Hostinger). Setelah itu update `NEXT_PUBLIC_SITE_URL` + Supabase Auth
   Redirect URL + R2 CORS dengan domain baru. (JANGAN pindah ke MySQL/Hostinger
   shared hosting — butuh rewrite total; sudah diputuskan tetap Vercel+Supabase.)
5. **Naikkan `MAX_UPLOAD_MB`** (di `src/lib/constants.ts`) setelah R2 aktif
   (saat ini 50, bisa ke 200+).
6. Tab **Invoice** upload file PDF kwitansi/faktur belum (saat ini form data
   invoice saja). Bisa ditambah pakai pola R2 yang sama.
7. Status proyek lama ter-mapping otomatis ke DESIGN/PBG/SLF/SUPERVISI — user
   bisa edit manual per proyek bila perlu.

---

## 10. Perintah Penting

```bash
npm install
npm run build          # verifikasi sebelum push
npm run typecheck
# deploy: push ke DUA branch
git push origin HEAD:claude/busy-curie-6ao846
git push origin HEAD:main
```

Akun demo (bila DB di-seed): admin@rustika.co.id / Password123! (super_admin).
Login produksi: akun yang dibuat user via Supabase Auth (super admin
`anangahmad.ptrustika@gmail.com`).

---

## 11. Catatan Penting / Keputusan

- **Supabase client sengaja untyped** di boundary SDK (lihat `lib/supabase/*`),
  tipe row diterapkan di `lib/queries.ts`. Jangan pasang generic `<Database>` —
  bikin `.insert/.update` jadi `never`.
- **Status** kini kolom **text** (bukan enum) → tambah status baru cukup edit
  `PROJECT_STATUSES` di `constants.ts`, tanpa migrasi DB.
- **File storage** punya kolom `storage` ('supabase' | 'r2') per file → baca/
  hapus dirutekan per provider. Upload baru selalu 'r2' (butuh R2 aktif).
- Semua mutasi pakai **Server Actions**; AI via Route Handler `api/assistant`.
- Pencocokan progres VALE by **nama dinormalisasi** (bukan kode), karena kode
  proyek tidak sinkron dengan nomor di PDF.
```
