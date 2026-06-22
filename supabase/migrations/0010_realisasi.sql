-- ============================================================================
-- CLIENT RUSTIKA CONSULTANT — Schema Migration 0010
-- "Laporan Realisasi Progres" (PBG/SLF): simpan persen penyelesaian per item
-- WBS baku sebagai JSON pada proyek. Total realisasi (terhitung di aplikasi)
-- ditulis ke projects.progress agar tampil di dashboard & portal client.
-- Idempotent.
-- ============================================================================

alter table public.projects
  add column if not exists realisasi jsonb not null default '{}'::jsonb;

comment on column public.projects.realisasi is
  'Map { itemKey: persenPenyelesaian 0-100 } untuk Laporan Realisasi Progres (template baku PBG/SLF). Total tertimbang ditulis ke projects.progress.';
