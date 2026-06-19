-- ============================================================================
-- BERSIHKAN DUPLIKAT PROYEK — PT VALE INDONESIA Tbk
-- Jalankan di Supabase → SQL Editor (project Anda).
--
-- LATAR BELAKANG
--   Upload via Google Sheet (/api/sync/projects) meng-UPSERT proyek by `code`.
--   Karena `projects.code` UNIQUE, baris kembar hanya muncul kalau kode di
--   spreadsheet BEDA dari kode proyek lama (mis. ada awalan '#', spasi, atau
--   format kode berbeda) → sistem menganggapnya proyek baru → muncul baris
--   dengan NAMA sama tapi KODE beda (dobel).
--
-- STRATEGI
--   Kelompokkan proyek Vale berdasarkan NAMA yang dinormalisasi
--   ( regexp_replace(upper(name),'[^A-Z0-9]','','g') — sama seperti
--     seed-vale-progress.sql ). Dalam tiap grup, SIMPAN satu baris dan
--   HAPUS sisanya.
--
--   Default: SIMPAN baris TERLAMA (created_at paling awal = proyek asli
--   sebelum upload spreadsheet), HAPUS yang lebih baru (hasil upload).
--   Ini mengembalikan keadaan "seperti sebelum upload spreadsheet".
--
--   Saat sebuah proyek dihapus, semua data anaknya (progress, dokumen, foto,
--   invoice, approval, komentar, dll) IKUT terhapus otomatis via
--   ON DELETE CASCADE. Karena itu WAJIB cek PREVIEW dulu (Langkah 1).
--
-- URUTAN PEMAKAIAN
--   1) Jalankan LANGKAH 1 (PREVIEW) — read-only, tidak mengubah apa pun.
--   2) Periksa: tiap baris ber-action 'HAPUS (duplikat)' seharusnya punya
--      docs/imgs/invs = 0 (tidak ada file/invoice asli yang nempel). Pasangan
--      'KEEP' nya yang memegang data. Kalau ADA baris 'HAPUS' yang docs/imgs/
--      invs-nya > 0 sedangkan 'KEEP'-nya 0 → JANGAN lanjut, pakai VARIAN B.
--   3) Kalau preview sudah benar, jalankan LANGKAH 2 (DELETE).
--   4) Jalankan LANGKAH 3 (VERIFIKASI) untuk memastikan tidak ada sisa dobel.
-- ============================================================================


-- ── LANGKAH 1: PREVIEW (AMAN — tidak menghapus apa pun) ─────────────────────
with vale as (
  select id from public.clients where name ilike '%vale%' order by created_at limit 1
),
ranked as (
  select
    p.id, p.code, p.name, p.status, p.progress, p.created_at,
    regexp_replace(upper(p.name), '[^A-Z0-9]', '', 'g') as norm_name,
    (select count(*) from public.project_documents d where d.project_id = p.id) as docs,
    (select count(*) from public.project_images   i where i.project_id = p.id) as imgs,
    (select count(*) from public.invoices         v where v.project_id = p.id) as invs,
    (select count(*) from public.project_progress pr where pr.project_id = p.id) as progs,
    row_number() over (
      partition by regexp_replace(upper(p.name), '[^A-Z0-9]', '', 'g')
      order by p.created_at asc, p.id asc
    ) as rn,
    count(*) over (
      partition by regexp_replace(upper(p.name), '[^A-Z0-9]', '', 'g')
    ) as copies
  from public.projects p
  where p.client_id = (select id from vale)
)
select
  norm_name,
  copies                                                       as jumlah_salinan,
  case when rn = 1 then 'KEEP (asli/terlama)' else 'HAPUS (duplikat)' end as action,
  code, name, status, progress, created_at,
  docs, imgs, invs, progs
from ranked
where copies > 1
order by norm_name, rn;

-- (opsional) hitung berapa baris yang akan dihapus:
-- with vale as (...salin blok di atas...) select count(*) from ranked where copies > 1 and rn > 1;


-- ── LANGKAH 2: DELETE (PERMANEN — jalankan setelah PREVIEW benar) ───────────
-- VARIAN A (DEFAULT): simpan baris TERLAMA, hapus yang lebih baru.
with vale as (
  select id from public.clients where name ilike '%vale%' order by created_at limit 1
),
ranked as (
  select p.id,
    row_number() over (
      partition by regexp_replace(upper(p.name), '[^A-Z0-9]', '', 'g')
      order by p.created_at asc, p.id asc
    ) as rn
  from public.projects p
  where p.client_id = (select id from vale)
)
delete from public.projects
where id in (select id from ranked where rn > 1);

-- VARIAN B (CADANGAN): pakai HANYA jika di preview baris duplikat justru yang
-- memegang dokumen/foto/invoice. Ini menyimpan baris dengan DATA TERBANYAK
-- (lalu yang terlama), dan menghapus sisanya. Jalankan salah satu saja (A atau B).
--
-- with vale as (
--   select id from public.clients where name ilike '%vale%' order by created_at limit 1
-- ),
-- ranked as (
--   select p.id,
--     row_number() over (
--       partition by regexp_replace(upper(p.name), '[^A-Z0-9]', '', 'g')
--       order by
--         (  (select count(*) from public.project_documents d where d.project_id = p.id)
--          + (select count(*) from public.project_images   i where i.project_id = p.id)
--          + (select count(*) from public.invoices         v where v.project_id = p.id)
--          + (select count(*) from public.project_progress pr where pr.project_id = p.id)
--         ) desc,
--         p.created_at asc, p.id asc
--     ) as rn
--   from public.projects p
--   where p.client_id = (select id from vale)
-- )
-- delete from public.projects
-- where id in (select id from ranked where rn > 1);


-- ── LANGKAH 3: VERIFIKASI (harus 0 baris = tidak ada dobel lagi) ────────────
with vale as (
  select id from public.clients where name ilike '%vale%' order by created_at limit 1
)
select
  regexp_replace(upper(p.name), '[^A-Z0-9]', '', 'g') as norm_name,
  count(*) as salinan
from public.projects p
where p.client_id = (select id from vale)
group by 1
having count(*) > 1
order by salinan desc, norm_name;

-- Total proyek Vale setelah pembersihan:
-- with vale as (select id from public.clients where name ilike '%vale%' order by created_at limit 1)
-- select count(*) from public.projects where client_id = (select id from vale);
