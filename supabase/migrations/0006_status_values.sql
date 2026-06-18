-- ============================================================================
-- CLIENT RUSTIKA CONSULTANT — Migration 0006: project status set
-- Replace the fixed enum statuses with a free-form text column carrying the
-- new business statuses: PBG, SLF, PBG UNDER CONSTRUCTION,
-- SLF UNDER CONSTRUCTION, DESIGN, SUPERVISI.
-- ============================================================================

alter table public.projects alter column status drop default;
alter table public.projects alter column status type text using status::text;

-- Map legacy values to the new set (adjust per project later as needed).
update public.projects set status = case status
  when 'simbg'                then 'PBG'
  when 'construction_support' then 'SUPERVISI'
  when 'completed'            then 'SLF'
  when 'design'               then 'DESIGN'
  else 'DESIGN'
end
where status in ('planning','survey','design','simbg','review','construction_support','completed','on_hold');

alter table public.projects alter column status set default 'DESIGN';
