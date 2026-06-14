-- ============================================================================
-- CLIENT RUSTIKA CONSULTANT — Storage Migration 0003
-- Creates storage buckets and access policies.
-- Object paths are prefixed with the project id, e.g. "<project_id>/<file>".
-- ============================================================================

insert into storage.buckets (id, name, public)
values
  ('project-documents', 'project-documents', false),
  ('project-images',    'project-images',    false),
  ('avatars',           'avatars',           true)
on conflict (id) do nothing;

-- Helper: extract the leading folder (project id) from an object name.
create or replace function public.storage_project_id(object_name text)
returns uuid language sql immutable as $$
  select nullif(split_part(object_name, '/', 1), '')::uuid;
$$;

-- ── project-documents ───────────────────────────────────────────────────────
drop policy if exists "documents read" on storage.objects;
create policy "documents read" on storage.objects for select
  using (
    bucket_id = 'project-documents'
    and public.can_access_project(public.storage_project_id(name))
  );

drop policy if exists "documents write" on storage.objects;
create policy "documents write" on storage.objects for insert
  with check (
    bucket_id = 'project-documents'
    and public.can_edit_project(public.storage_project_id(name))
  );

drop policy if exists "documents update" on storage.objects;
create policy "documents update" on storage.objects for update
  using (
    bucket_id = 'project-documents'
    and public.can_edit_project(public.storage_project_id(name))
  );

drop policy if exists "documents delete" on storage.objects;
create policy "documents delete" on storage.objects for delete
  using (
    bucket_id = 'project-documents'
    and public.can_edit_project(public.storage_project_id(name))
  );

-- ── project-images ──────────────────────────────────────────────────────────
drop policy if exists "images read" on storage.objects;
create policy "images read" on storage.objects for select
  using (
    bucket_id = 'project-images'
    and public.can_access_project(public.storage_project_id(name))
  );

drop policy if exists "images write" on storage.objects;
create policy "images write" on storage.objects for insert
  with check (
    bucket_id = 'project-images'
    and public.can_edit_project(public.storage_project_id(name))
  );

drop policy if exists "images delete" on storage.objects;
create policy "images delete" on storage.objects for delete
  using (
    bucket_id = 'project-images'
    and public.can_edit_project(public.storage_project_id(name))
  );

-- ── avatars (public read, owner write) ──────────────────────────────────────
drop policy if exists "avatars read" on storage.objects;
create policy "avatars read" on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "avatars write" on storage.objects;
create policy "avatars write" on storage.objects for insert
  with check (bucket_id = 'avatars' and owner = auth.uid());

drop policy if exists "avatars update" on storage.objects;
create policy "avatars update" on storage.objects for update
  using (bucket_id = 'avatars' and owner = auth.uid());
