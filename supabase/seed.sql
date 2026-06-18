-- ============================================================================
-- CLIENT RUSTIKA CONSULTANT — Seed data (development only)
--
-- NOTE: Auth users must be created first via Supabase Auth (Dashboard or API),
-- because profiles.id references auth.users(id). After creating the users below
-- in Authentication → Users, replace the UUIDs to match, then run this file.
--
--   admin@rustika.co.id    / role super_admin
--   pm@rustika.co.id       / role project_manager
--   surveyor@rustika.co.id / role staff (surveyor)
--   client@vale.com        / role client
-- ============================================================================

-- For local dev with the Supabase CLI you can insert directly into auth.users.
-- (On a hosted project, create users via the Auth API instead.)
insert into auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data)
values
  ('00000000-0000-0000-0000-000000000001', 'admin@rustika.co.id',
   crypt('Password123!', gen_salt('bf')), now(),
   '{"full_name":"Ananda Rustika","role":"super_admin"}'),
  ('00000000-0000-0000-0000-000000000010', 'pm@rustika.co.id',
   crypt('Password123!', gen_salt('bf')), now(),
   '{"full_name":"Bayu Pratama","role":"project_manager"}'),
  ('00000000-0000-0000-0000-000000000020', 'surveyor@rustika.co.id',
   crypt('Password123!', gen_salt('bf')), now(),
   '{"full_name":"Cahyo Surveyor","role":"staff"}'),
  ('00000000-0000-0000-0000-000000000030', 'client@vale.com',
   crypt('Password123!', gen_salt('bf')), now(),
   '{"full_name":"Rini (PT Vale)","role":"client"}')
on conflict (id) do nothing;

-- Clients
insert into public.clients (id, name, company, email, phone, address, created_by)
values
  ('11111111-1111-1111-1111-111111111111', 'PT Vale Indonesia', 'PT Vale Indonesia Tbk',
   'project@vale.com', '+62 21 524 9000', 'Sorowako, Luwu Timur', '00000000-0000-0000-0000-000000000001'),
  ('22222222-2222-2222-2222-222222222222', 'Pemkab Luwu Timur', 'Pemerintah Kabupaten Luwu Timur',
   'setda@luwutimurkab.go.id', '+62 474 321 100', 'Malili, Luwu Timur', '00000000-0000-0000-0000-000000000001')
on conflict (id) do nothing;

-- Make sure the profile trigger ran; patch role + client link.
update public.profiles set role = 'super_admin' where id = '00000000-0000-0000-0000-000000000001';
update public.profiles set role = 'project_manager' where id = '00000000-0000-0000-0000-000000000010';
update public.profiles set role = 'staff', staff_category = 'surveyor' where id = '00000000-0000-0000-0000-000000000020';
update public.profiles set role = 'client', client_id = '11111111-1111-1111-1111-111111111111'
  where id = '00000000-0000-0000-0000-000000000030';

-- Projects
insert into public.projects
  (id, code, name, client_id, project_type, location, area_size, project_manager_id,
   start_date, end_date, contract_value, status, progress, description, created_by)
values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'RC-2025-001', 'Kantor VALE Sorowako',
   '11111111-1111-1111-1111-111111111111', 'Konsultan Arsitektur', 'Sorowako, Luwu Timur', 4500,
   '00000000-0000-0000-0000-000000000010', '2025-02-01', '2025-09-30', 1850000000, 'DESIGN', 62,
   'Perencanaan gedung kantor 3 lantai.', '00000000-0000-0000-0000-000000000001'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'RC-2025-002', 'Pemetaan Drone Kawasan Industri Malili',
   '22222222-2222-2222-2222-222222222222', 'Drone Mapping', 'Malili, Luwu Timur', 125000,
   '00000000-0000-0000-0000-000000000010', '2025-03-10', '2025-07-15', 640000000, 'DESIGN', 38,
   'Pemetaan udara orthomosaic & DTM.', '00000000-0000-0000-0000-000000000001')
on conflict (id) do nothing;

-- Project members
insert into public.project_members (project_id, user_id, role_in_project)
values
  ('aaaaaaaa-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'Project Manager'),
  ('aaaaaaaa-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000020', 'Surveyor')
on conflict do nothing;

-- A couple of progress rows (trigger updates projects.progress)
insert into public.project_progress (project_id, report_date, progress_percent, division, description, created_by)
values
  ('aaaaaaaa-0000-0000-0000-000000000001', '2025-04-20', 40, 'Arsitektur', 'Pra-rencana disetujui.', '00000000-0000-0000-0000-000000000010'),
  ('aaaaaaaa-0000-0000-0000-000000000001', '2025-06-10', 62, 'SIMBG', 'Berkas SIMBG tahap 1 diajukan.', '00000000-0000-0000-0000-000000000010')
on conflict do nothing;

-- Invoice + approval samples
insert into public.invoices (project_id, invoice_number, termin, amount, issue_date, due_date, status, created_by)
values ('aaaaaaaa-0000-0000-0000-000000000001', 'INV/RC/2025/001', 'Termin 1 (DP 30%)', 555000000,
        '2025-02-05', '2025-02-20', 'paid', '00000000-0000-0000-0000-000000000001')
on conflict do nothing;

insert into public.approvals (project_id, title, description, status, requested_by)
values ('aaaaaaaa-0000-0000-0000-000000000001', 'Persetujuan Gambar Arsitektur Rev 2',
        'Mohon review denah lantai 1-3.', 'pending', '00000000-0000-0000-0000-000000000010')
on conflict do nothing;
