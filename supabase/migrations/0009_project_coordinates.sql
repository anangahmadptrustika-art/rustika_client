-- ============================================================================
-- CLIENT RUSTIKA CONSULTANT — Schema Migration 0009
-- Menambah titik koordinat (lat/long) pada proyek, untuk pin presisi di peta.
-- Dijalankan di Supabase → SQL Editor. Aman dijalankan ulang (idempotent).
-- ============================================================================

alter table public.projects
  add column if not exists latitude  double precision,
  add column if not exists longitude double precision;

comment on column public.projects.latitude  is
  'Lintang dalam derajat desimal (negatif = LS). Diisi dari kolom "Koordinat" di spreadsheet via /api/sync/projects.';
comment on column public.projects.longitude is
  'Bujur dalam derajat desimal (negatif = BB).';
