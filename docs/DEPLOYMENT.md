# Deployment Guide — CLIENT RUSTIKA CONSULTANT

Panduan menghubungkan **Supabase** dan men-deploy ke **Vercel**.

## 1. Buat Project Supabase

1. Masuk ke [supabase.com](https://supabase.com) → **New Project**.
2. Catat dari **Project Settings → API**:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` → `SUPABASE_SERVICE_ROLE_KEY` (**server only**)

## 2. Jalankan Migrasi

### Opsi A — Supabase CLI (disarankan)
```bash
npm i -g supabase
supabase link --project-ref <ref>
supabase db push          # menerapkan supabase/migrations/*
# Seed (dev/staging):
supabase db execute --file supabase/seed.sql
```

### Opsi B — SQL Editor (manual)
Buka **SQL Editor** di dashboard, lalu jalankan berurutan:
1. `supabase/migrations/0001_schema.sql`
2. `supabase/migrations/0002_rls.sql`
3. `supabase/migrations/0003_storage.sql`
4. (opsional) `supabase/seed.sql`

## 3. Konfigurasi Auth

- **Authentication → URL Configuration**:
  - Site URL: `https://<domain-anda>` (atau `http://localhost:3000` untuk dev)
  - Redirect URLs: tambahkan `https://<domain-anda>/auth/callback`
- **Providers**: Email aktif secara default. Aktifkan OAuth (Google, dsb.) bila
  perlu — callback sudah ditangani di `/auth/callback`.

## 4. Buat User Awal

`profiles` dibuat otomatis oleh trigger `handle_new_user` saat user auth dibuat.

1. **Authentication → Users → Add user** (mis. `admin@rustika.co.id`).
2. Di **SQL Editor**, set perannya:
   ```sql
   update public.profiles set role = 'super_admin'
   where email = 'admin@rustika.co.id';
   ```
3. Untuk user **client**, tautkan ke client:
   ```sql
   update public.profiles
   set role = 'client', client_id = '<uuid-client>'
   where email = 'client@vale.com';
   ```

## 5. Storage Buckets

Migrasi `0003_storage.sql` membuat bucket `project-documents`,
`project-images`, `avatars` beserta policy. Pastikan ketiganya muncul di
**Storage**. Path objek diawali `project_id/...` agar policy storage selaras RLS.

## 6. Deploy ke Vercel

1. Import repo di [vercel.com](https://vercel.com).
2. Framework Preset: **Next.js** (otomatis).
3. **Environment Variables** (Production & Preview):
   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   SUPABASE_SERVICE_ROLE_KEY=...
   NEXT_PUBLIC_SITE_URL=https://<domain-anda>
   ANTHROPIC_API_KEY=...        # opsional, untuk AI penuh
   ANTHROPIC_MODEL=claude-sonnet-4-6
   ```
4. **Deploy**. Tanpa env Supabase, build tetap sukses dalam **demo mode**.

## 7. (Opsional) Scheduled Jobs

Tandai invoice overdue otomatis dengan `pg_cron`:
```sql
select cron.schedule(
  'mark-overdue', '0 1 * * *',
  $$ select public.mark_overdue_invoices(); $$
);
```

## 8. Checklist Pasca-Deploy

- [ ] Login berhasil dengan user nyata (bukan demo).
- [ ] Client hanya melihat proyek miliknya (uji RLS).
- [ ] Staff tidak melihat tab/menu Invoice.
- [ ] Upload ke Storage tunduk pada akses proyek.
- [ ] AI assistant menjawab (badge "Live (Claude)").
