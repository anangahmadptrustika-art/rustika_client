-- ============================================================================
-- CLIENT RUSTIKA CONSULTANT — Schema Migration 0001
-- PostgreSQL 15 (Supabase). Creates enums, tables, indexes, and triggers.
-- ============================================================================

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ── Enums ───────────────────────────────────────────────────────────────────
do $$ begin
  create type user_role as enum ('super_admin', 'project_manager', 'staff', 'client');
exception when duplicate_object then null; end $$;

do $$ begin
  create type staff_category as enum ('surveyor', 'architect', 'drafter', 'engineer', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type project_status as enum (
    'planning', 'survey', 'design', 'simbg', 'review',
    'construction_support', 'completed', 'on_hold'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type document_category as enum (
    'kajian_teknis', 'simbg', 'survey', 'drone', 'invoice', 'other'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type image_category as enum ('existing', 'survey', 'progress', 'final');
exception when duplicate_object then null; end $$;

do $$ begin
  create type invoice_status as enum ('draft', 'sent', 'paid', 'overdue');
exception when duplicate_object then null; end $$;

do $$ begin
  create type approval_status as enum ('pending', 'approved', 'revision_requested');
exception when duplicate_object then null; end $$;

do $$ begin
  create type activity_type as enum (
    'upload', 'progress', 'approval', 'comment', 'login', 'project', 'invoice', 'member'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type notification_type as enum (
    'document_uploaded', 'progress_updated', 'approval_required',
    'invoice_created', 'comment_added', 'mention'
  );
exception when duplicate_object then null; end $$;

-- ── clients ─────────────────────────────────────────────────────────────────
create table if not exists public.clients (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  company     text,
  email       text,
  phone       text,
  address     text,
  logo_url    text,
  created_by  uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ── profiles (1:1 with auth.users) ──────────────────────────────────────────
create table if not exists public.profiles (
  id             uuid primary key references auth.users (id) on delete cascade,
  email          text not null,
  full_name      text not null default '',
  avatar_url     text,
  role           user_role not null default 'staff',
  staff_category staff_category,
  phone          text,
  client_id      uuid references public.clients (id) on delete set null,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ── projects ────────────────────────────────────────────────────────────────
create table if not exists public.projects (
  id                 uuid primary key default uuid_generate_v4(),
  code               text not null unique,
  name               text not null,
  client_id          uuid not null references public.clients (id) on delete restrict,
  project_type       text,
  location           text,
  area_size          numeric,
  project_manager_id uuid references public.profiles (id) on delete set null,
  start_date         date,
  end_date           date,
  contract_value     numeric,
  status             text not null default 'DESIGN',
  progress           numeric(5,2) not null default 0 check (progress between 0 and 100),
  description        text,
  created_by         uuid references auth.users (id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- ── project_members ─────────────────────────────────────────────────────────
create table if not exists public.project_members (
  id              uuid primary key default uuid_generate_v4(),
  project_id      uuid not null references public.projects (id) on delete cascade,
  user_id         uuid not null references public.profiles (id) on delete cascade,
  role_in_project text,
  created_at      timestamptz not null default now(),
  unique (project_id, user_id)
);

-- ── project_documents ───────────────────────────────────────────────────────
create table if not exists public.project_documents (
  id          uuid primary key default uuid_generate_v4(),
  project_id  uuid not null references public.projects (id) on delete cascade,
  category    document_category not null default 'other',
  subcategory text,
  name        text not null,
  file_path   text not null,
  file_url    text,
  file_type   text,
  file_size   bigint,
  version     integer not null default 1,
  description text,
  uploaded_by uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now()
);

-- ── project_images ──────────────────────────────────────────────────────────
create table if not exists public.project_images (
  id          uuid primary key default uuid_generate_v4(),
  project_id  uuid not null references public.projects (id) on delete cascade,
  category    image_category not null default 'progress',
  title       text,
  file_path   text not null,
  file_url    text,
  file_size   bigint,
  tags        text[],
  taken_at    timestamptz,
  uploaded_by uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now()
);

-- ── project_progress ────────────────────────────────────────────────────────
create table if not exists public.project_progress (
  id                 uuid primary key default uuid_generate_v4(),
  project_id         uuid not null references public.projects (id) on delete cascade,
  report_date        date not null default current_date,
  progress_percent   numeric(5,2) not null check (progress_percent between 0 and 100),
  division           text,
  description        text,
  obstacle           text,
  solution           text,
  documentation_urls text[],
  created_by         uuid references public.profiles (id) on delete set null,
  created_at         timestamptz not null default now()
);

-- ── area_data (Data Luasan) ─────────────────────────────────────────────────
create table if not exists public.area_data (
  id            uuid primary key default uuid_generate_v4(),
  project_id    uuid not null references public.projects (id) on delete cascade,
  luas_site     numeric,
  luas_bangunan numeric,
  luas_lantai   numeric,
  kdb           numeric,
  klb           numeric,
  kdh           numeric,
  gsb           numeric,
  notes         text,
  created_by    uuid references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ── invoices ────────────────────────────────────────────────────────────────
create table if not exists public.invoices (
  id               uuid primary key default uuid_generate_v4(),
  project_id       uuid not null references public.projects (id) on delete cascade,
  invoice_number   text not null,
  termin           text,
  amount           numeric not null default 0,
  issue_date       date,
  due_date         date,
  status           invoice_status not null default 'draft',
  invoice_file_url text,
  receipt_file_url text,
  tax_file_url     text,
  notes            text,
  created_by       uuid references public.profiles (id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ── approvals ───────────────────────────────────────────────────────────────
create table if not exists public.approvals (
  id            uuid primary key default uuid_generate_v4(),
  project_id    uuid not null references public.projects (id) on delete cascade,
  document_id   uuid references public.project_documents (id) on delete set null,
  title         text not null,
  description   text,
  status        approval_status not null default 'pending',
  requested_by  uuid references public.profiles (id) on delete set null,
  responded_by  uuid references public.profiles (id) on delete set null,
  response_note text,
  responded_at  timestamptz,
  created_at    timestamptz not null default now()
);

-- ── comments (threaded discussion) ──────────────────────────────────────────
create table if not exists public.comments (
  id             uuid primary key default uuid_generate_v4(),
  project_id     uuid not null references public.projects (id) on delete cascade,
  parent_id      uuid references public.comments (id) on delete cascade,
  user_id        uuid not null references public.profiles (id) on delete cascade,
  body           text not null,
  attachment_url text,
  mentions       uuid[],
  created_at     timestamptz not null default now()
);

-- ── activities (audit / timeline) ───────────────────────────────────────────
create table if not exists public.activities (
  id          uuid primary key default uuid_generate_v4(),
  project_id  uuid references public.projects (id) on delete cascade,
  user_id     uuid references public.profiles (id) on delete set null,
  type        activity_type not null,
  entity_type text,
  entity_id   uuid,
  description text not null,
  metadata    jsonb,
  created_at  timestamptz not null default now()
);

-- ── notifications ───────────────────────────────────────────────────────────
create table if not exists public.notifications (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  project_id  uuid references public.projects (id) on delete cascade,
  type        notification_type not null,
  title       text not null,
  body        text,
  link        text,
  is_read     boolean not null default false,
  created_at  timestamptz not null default now()
);

-- ── Indexes ─────────────────────────────────────────────────────────────────
create index if not exists idx_profiles_role        on public.profiles (role);
create index if not exists idx_profiles_client       on public.profiles (client_id);
create index if not exists idx_projects_client       on public.projects (client_id);
create index if not exists idx_projects_pm           on public.projects (project_manager_id);
create index if not exists idx_projects_status       on public.projects (status);
create index if not exists idx_members_project       on public.project_members (project_id);
create index if not exists idx_members_user          on public.project_members (user_id);
create index if not exists idx_docs_project          on public.project_documents (project_id);
create index if not exists idx_docs_category         on public.project_documents (project_id, category);
create index if not exists idx_images_project        on public.project_images (project_id);
create index if not exists idx_images_tags           on public.project_images using gin (tags);
create index if not exists idx_progress_project      on public.project_progress (project_id, report_date desc);
create index if not exists idx_invoices_project      on public.invoices (project_id);
create index if not exists idx_approvals_project     on public.approvals (project_id);
create index if not exists idx_comments_project      on public.comments (project_id);
create index if not exists idx_activities_project    on public.activities (project_id, created_at desc);
create index if not exists idx_notifications_user    on public.notifications (user_id, is_read);

-- Full text search support for the global search engine.
create index if not exists idx_projects_search on public.projects
  using gin (to_tsvector('simple', coalesce(name,'') || ' ' || coalesce(code,'') || ' ' || coalesce(location,'')));
create index if not exists idx_documents_search on public.project_documents
  using gin (to_tsvector('simple', coalesce(name,'') || ' ' || coalesce(description,'')));

-- ============================================================================
-- Triggers & functions
-- ============================================================================

-- updated_at maintenance
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

do $$
declare t text;
begin
  foreach t in array array['clients','profiles','projects','area_data','invoices'] loop
    execute format(
      'drop trigger if exists trg_%1$s_updated on public.%1$s;
       create trigger trg_%1$s_updated before update on public.%1$s
       for each row execute function public.set_updated_at();', t);
  end loop;
end $$;

-- Auto-create a profile when a new auth user is created.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    coalesce((new.raw_user_meta_data ->> 'role')::user_role, 'staff')
  )
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep projects.progress in sync with the latest progress report.
create or replace function public.sync_project_progress()
returns trigger language plpgsql as $$
declare pid uuid;
begin
  pid := coalesce(new.project_id, old.project_id);
  update public.projects p
  set progress = coalesce((
    select progress_percent from public.project_progress
    where project_id = pid order by report_date desc, created_at desc limit 1
  ), 0)
  where p.id = pid;
  return coalesce(new, old);
end; $$;

drop trigger if exists trg_sync_progress on public.project_progress;
create trigger trg_sync_progress
  after insert or update or delete on public.project_progress
  for each row execute function public.sync_project_progress();

-- Auto-mark invoices overdue when due date passes (helper for a scheduled job).
create or replace function public.mark_overdue_invoices()
returns void language sql as $$
  update public.invoices
  set status = 'overdue'
  where status = 'sent' and due_date is not null and due_date < current_date;
$$;
