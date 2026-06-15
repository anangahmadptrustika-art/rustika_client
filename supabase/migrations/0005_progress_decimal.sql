-- ============================================================================
-- CLIENT RUSTIKA CONSULTANT — Migration 0005: decimal progress
-- Allow progress values to carry up to 2 decimal places (e.g. 14.50%).
-- Safe widening from integer → numeric(5,2); no data loss.
-- ============================================================================

alter table public.projects
  alter column progress type numeric(5,2) using progress::numeric;

alter table public.project_progress
  alter column progress_percent type numeric(5,2) using progress_percent::numeric;
