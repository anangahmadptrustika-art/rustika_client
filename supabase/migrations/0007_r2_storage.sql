-- ============================================================================
-- CLIENT RUSTIKA CONSULTANT — Migration 0007: storage provider flag
-- Files migrate to Cloudflare R2. Existing rows stay on Supabase Storage; new
-- uploads are tagged 'r2'. The app reads each file from the right provider.
-- ============================================================================

alter table public.project_documents
  add column if not exists storage text not null default 'supabase';

alter table public.project_images
  add column if not exists storage text not null default 'supabase';
