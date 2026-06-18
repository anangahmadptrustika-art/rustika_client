-- ============================================================================
-- CLIENT RUSTIKA CONSULTANT — Migration 0008: Per-project share token
--
-- Adds a per-PROJECT secret share token, mirroring clients.share_token. It
-- powers a no-login portal (/portal/proyek/<token>) that shows ONLY that one
-- project — handy for sharing a single project to the PM who monitors it.
-- The token is a 128-bit random hex string (unguessable).
-- ============================================================================

alter table public.projects
  add column if not exists share_token text unique;

-- Backfill tokens for existing projects.
update public.projects
  set share_token = encode(gen_random_bytes(16), 'hex')
  where share_token is null;

-- New projects get a token automatically.
alter table public.projects
  alter column share_token set default encode(gen_random_bytes(16), 'hex');

create index if not exists idx_projects_share_token on public.projects (share_token);
