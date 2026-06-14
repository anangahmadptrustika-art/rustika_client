-- ============================================================================
-- CLIENT RUSTIKA CONSULTANT — RLS Migration 0002
-- Row Level Security policies enforcing the role permission matrix.
--
-- Helper functions are SECURITY DEFINER so that reading `profiles` inside a
-- policy does not recurse into `profiles`' own RLS policies.
-- ============================================================================

-- ── Helper functions ────────────────────────────────────────────────────────
create or replace function public.current_role()
returns user_role language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.current_client_id()
returns uuid language sql stable security definer set search_path = public as $$
  select client_id from public.profiles where id = auth.uid();
$$;

create or replace function public.is_super_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'super_admin' from public.profiles where id = auth.uid()), false);
$$;

-- Read access: super admin, the project's PM, members, or the owning client.
create or replace function public.can_access_project(pid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select
    public.is_super_admin()
    or exists (select 1 from public.projects p where p.id = pid and p.project_manager_id = auth.uid())
    or exists (select 1 from public.project_members m where m.project_id = pid and m.user_id = auth.uid())
    or exists (
      select 1 from public.projects p
      join public.profiles pr on pr.id = auth.uid()
      where p.id = pid and pr.role = 'client' and p.client_id = pr.client_id
    );
$$;

-- Write access (upload/progress): super admin, PM, or internal members.
-- Clients can read but not write project content.
create or replace function public.can_edit_project(pid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select
    public.is_super_admin()
    or exists (select 1 from public.projects p where p.id = pid and p.project_manager_id = auth.uid())
    or exists (
      select 1 from public.project_members m
      join public.profiles pr on pr.id = m.user_id
      where m.project_id = pid and m.user_id = auth.uid() and pr.role in ('project_manager','staff')
    );
$$;

-- ── Enable RLS on every table ───────────────────────────────────────────────
alter table public.clients            enable row level security;
alter table public.profiles           enable row level security;
alter table public.projects           enable row level security;
alter table public.project_members    enable row level security;
alter table public.project_documents  enable row level security;
alter table public.project_images     enable row level security;
alter table public.project_progress   enable row level security;
alter table public.area_data          enable row level security;
alter table public.invoices           enable row level security;
alter table public.approvals          enable row level security;
alter table public.comments           enable row level security;
alter table public.activities         enable row level security;
alter table public.notifications      enable row level security;

-- ── profiles ────────────────────────────────────────────────────────────────
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select
  using (
    id = auth.uid()
    or public.is_super_admin()
    or public.current_role() in ('project_manager','staff')   -- internal team directory
  );

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles for update
  using (id = auth.uid() or public.is_super_admin())
  with check (id = auth.uid() or public.is_super_admin());

drop policy if exists profiles_admin_all on public.profiles;
create policy profiles_admin_all on public.profiles for all
  using (public.is_super_admin()) with check (public.is_super_admin());

-- ── clients ─────────────────────────────────────────────────────────────────
drop policy if exists clients_select on public.clients;
create policy clients_select on public.clients for select
  using (
    public.is_super_admin()
    or public.current_role() in ('project_manager','staff')
    or id = public.current_client_id()
  );

drop policy if exists clients_write on public.clients;
create policy clients_write on public.clients for all
  using (public.is_super_admin() or public.current_role() = 'project_manager')
  with check (public.is_super_admin() or public.current_role() = 'project_manager');

-- ── projects ────────────────────────────────────────────────────────────────
drop policy if exists projects_select on public.projects;
create policy projects_select on public.projects for select
  using (public.can_access_project(id));

drop policy if exists projects_insert on public.projects;
create policy projects_insert on public.projects for insert
  with check (public.is_super_admin() or public.current_role() = 'project_manager');

drop policy if exists projects_update on public.projects;
create policy projects_update on public.projects for update
  using (public.is_super_admin() or project_manager_id = auth.uid())
  with check (public.is_super_admin() or project_manager_id = auth.uid());

drop policy if exists projects_delete on public.projects;
create policy projects_delete on public.projects for delete
  using (public.is_super_admin());

-- ── project_members ─────────────────────────────────────────────────────────
drop policy if exists members_select on public.project_members;
create policy members_select on public.project_members for select
  using (public.can_access_project(project_id));

drop policy if exists members_write on public.project_members;
create policy members_write on public.project_members for all
  using (
    public.is_super_admin()
    or exists (select 1 from public.projects p where p.id = project_id and p.project_manager_id = auth.uid())
  )
  with check (
    public.is_super_admin()
    or exists (select 1 from public.projects p where p.id = project_id and p.project_manager_id = auth.uid())
  );

-- ── Generic project-scoped content (read = access, write = edit) ─────────────
-- documents
drop policy if exists docs_select on public.project_documents;
create policy docs_select on public.project_documents for select using (public.can_access_project(project_id));
drop policy if exists docs_write on public.project_documents;
create policy docs_write on public.project_documents for all
  using (public.can_edit_project(project_id)) with check (public.can_edit_project(project_id));

-- images
drop policy if exists images_select on public.project_images;
create policy images_select on public.project_images for select using (public.can_access_project(project_id));
drop policy if exists images_write on public.project_images;
create policy images_write on public.project_images for all
  using (public.can_edit_project(project_id)) with check (public.can_edit_project(project_id));

-- progress
drop policy if exists progress_select on public.project_progress;
create policy progress_select on public.project_progress for select using (public.can_access_project(project_id));
drop policy if exists progress_write on public.project_progress;
create policy progress_write on public.project_progress for all
  using (public.can_edit_project(project_id)) with check (public.can_edit_project(project_id));

-- area data
drop policy if exists area_select on public.area_data;
create policy area_select on public.area_data for select using (public.can_access_project(project_id));
drop policy if exists area_write on public.area_data;
create policy area_write on public.area_data for all
  using (public.can_edit_project(project_id)) with check (public.can_edit_project(project_id));

-- ── invoices (FINANCE — staff excluded) ─────────────────────────────────────
drop policy if exists invoices_select on public.invoices;
create policy invoices_select on public.invoices for select
  using (
    public.can_access_project(project_id)
    and public.current_role() <> 'staff'   -- staff cannot view finance
  );
drop policy if exists invoices_write on public.invoices;
create policy invoices_write on public.invoices for all
  using (public.is_super_admin() or exists (
    select 1 from public.projects p where p.id = project_id and p.project_manager_id = auth.uid()))
  with check (public.is_super_admin() or exists (
    select 1 from public.projects p where p.id = project_id and p.project_manager_id = auth.uid()));

-- ── approvals (client responds, PM/admin requests) ──────────────────────────
drop policy if exists approvals_select on public.approvals;
create policy approvals_select on public.approvals for select using (public.can_access_project(project_id));
drop policy if exists approvals_insert on public.approvals;
create policy approvals_insert on public.approvals for insert
  with check (public.can_edit_project(project_id));
drop policy if exists approvals_update on public.approvals;
create policy approvals_update on public.approvals for update
  using (
    public.can_edit_project(project_id)
    or (public.current_role() = 'client' and public.can_access_project(project_id))
  )
  with check (public.can_access_project(project_id));

-- ── comments (everyone with access can post) ────────────────────────────────
drop policy if exists comments_select on public.comments;
create policy comments_select on public.comments for select using (public.can_access_project(project_id));
drop policy if exists comments_insert on public.comments;
create policy comments_insert on public.comments for insert
  with check (public.can_access_project(project_id) and user_id = auth.uid());
drop policy if exists comments_update on public.comments;
create policy comments_update on public.comments for update
  using (user_id = auth.uid() or public.is_super_admin())
  with check (user_id = auth.uid() or public.is_super_admin());
drop policy if exists comments_delete on public.comments;
create policy comments_delete on public.comments for delete
  using (user_id = auth.uid() or public.is_super_admin());

-- ── activities (read-only audit; inserted by app/triggers) ──────────────────
drop policy if exists activities_select on public.activities;
create policy activities_select on public.activities for select
  using (project_id is null or public.can_access_project(project_id));
drop policy if exists activities_insert on public.activities;
create policy activities_insert on public.activities for insert
  with check (auth.uid() is not null);

-- ── notifications (each user sees only their own) ───────────────────────────
drop policy if exists notifications_select on public.notifications;
create policy notifications_select on public.notifications for select using (user_id = auth.uid());
drop policy if exists notifications_update on public.notifications;
create policy notifications_update on public.notifications for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists notifications_insert on public.notifications;
create policy notifications_insert on public.notifications for insert
  with check (auth.uid() is not null);
