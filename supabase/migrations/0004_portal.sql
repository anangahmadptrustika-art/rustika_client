-- ============================================================================
-- CLIENT RUSTIKA CONSULTANT — Migration 0004: Public Client Portal
--
-- Adds a per-client secret share token. The token powers a no-login portal
-- (/portal/<token>) that a client opens via a QR code to view ONLY their own
-- projects. The token is a 128-bit random hex string (unguessable).
-- ============================================================================

alter table public.clients
  add column if not exists share_token text unique;

-- Backfill tokens for existing clients.
update public.clients
  set share_token = encode(gen_random_bytes(16), 'hex')
  where share_token is null;

-- New clients get a token automatically.
alter table public.clients
  alter column share_token set default encode(gen_random_bytes(16), 'hex');

create index if not exists idx_clients_share_token on public.clients (share_token);
