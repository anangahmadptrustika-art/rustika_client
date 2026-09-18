-- ============================================================================
-- Dijalankan (sebagai supabase_admin) SETELAH skema public dibuat — baik dari
-- migrasi baru (supabase/migrations/*.sql) maupun dari restore Supabase cloud.
-- Idempoten: aman dijalankan berulang.
--
-- 1) Pemilik objek public = postgres (sama seperti di Supabase cloud).
-- 2) Hak akses role API (anon/authenticated/service_role) + default privileges.
-- 3) Trigger auth.users → public.profiles (tidak ikut dump skema "public").
-- ============================================================================

-- 1) Normalisasi pemilik objek di skema public → postgres
do $$
declare r record;
begin
  for r in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I owner to postgres', r.tablename);
  end loop;
  for r in select sequencename from pg_sequences where schemaname = 'public' loop
    execute format('alter sequence public.%I owner to postgres', r.sequencename);
  end loop;
  for r in select viewname from pg_views where schemaname = 'public' loop
    execute format('alter view public.%I owner to postgres', r.viewname);
  end loop;
  for r in
    select p.oid::regprocedure as sig,
           case p.prokind when 'p' then 'procedure' when 'a' then 'aggregate' else 'function' end as kind
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
  loop
    execute format('alter %s %s owner to postgres', r.kind, r.sig);
  end loop;
  for r in
    select t.typname
    from pg_type t join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typtype in ('e', 'd', 'c')
      and not exists (select 1 from pg_class c where c.reltype = t.oid) -- bukan row type tabel
  loop
    execute format('alter type public.%I owner to postgres', r.typname);
  end loop;
end $$;

-- 2) Hak akses seperti default Supabase
grant usage on schema public to postgres, anon, authenticated, service_role;
grant all on all tables    in schema public to postgres, anon, authenticated, service_role;
grant all on all sequences in schema public to postgres, anon, authenticated, service_role;
grant all on all functions in schema public to postgres, anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  grant all on tables to postgres, anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  grant all on sequences to postgres, anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  grant all on functions to postgres, anon, authenticated, service_role;
alter default privileges for role supabase_admin in schema public
  grant all on tables to postgres, anon, authenticated, service_role;
alter default privileges for role supabase_admin in schema public
  grant all on sequences to postgres, anon, authenticated, service_role;
alter default privileges for role supabase_admin in schema public
  grant all on functions to postgres, anon, authenticated, service_role;

-- 3) Trigger pembuatan profil otomatis saat user auth dibuat
--    (fungsi public.handle_new_user() berasal dari migrasi 0001 / dump cloud)
do $$
begin
  if exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'handle_new_user'
  ) then
    execute 'drop trigger if exists on_auth_user_created on auth.users';
    execute 'create trigger on_auth_user_created after insert on auth.users
             for each row execute function public.handle_new_user()';
  end if;
end $$;

-- Fungsi trigger dipanggil oleh supabase_auth_admin (GoTrue)
grant usage on schema public to supabase_auth_admin;
do $$
begin
  if exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'handle_new_user'
  ) then
    execute 'grant execute on function public.handle_new_user() to supabase_auth_admin';
  end if;
end $$;

analyze;
