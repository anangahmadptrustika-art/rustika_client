-- ============================================================================
-- REKAP PROGRES PROYEK VALE  (jalankan di Supabase SQL Editor, project Anda)
-- Mencocokkan by NAMA proyek (dinormalisasi) pada client VALE. Proyek yang
-- tidak ada di aplikasi otomatis dilewati. Aman dijalankan ulang (idempotent).
-- ============================================================================
with vale as (
  select id from public.clients where name ilike '%vale%' order by created_at limit 1
),
data(norm_name, report_date, pct) as (
  values
    ('BIODIGESTER', date '2025-11-27', 82),
    ('BIODIGESTER', date '2026-02-09', 95),
    ('BIODIGESTER', date '2026-06-08', 97),
    ('DUSTAGLOMERATION', date '2026-02-09', 40),
    ('DUSTAGLOMERATION', date '2026-06-08', 40),
    ('WATULABUWAREHOUSE', date '2025-11-27', 82),
    ('WATULABUWAREHOUSE', date '2026-02-09', 95),
    ('WATULABUWAREHOUSE', date '2026-06-08', 97),
    ('ASPHALMIXINGPLANTAMP', date '2025-11-27', 32),
    ('ASPHALMIXINGPLANTAMP', date '2026-02-09', 45),
    ('ASPHALMIXINGPLANTAMP', date '2026-06-08', 70),
    ('BANGUNANTOPDAMBALAMBANO', date '2025-11-27', 82),
    ('BANGUNANTOPDAMBALAMBANO', date '2026-02-09', 95),
    ('BANGUNANTOPDAMBALAMBANO', date '2026-06-08', 97),
    ('VERBEEKOFFICEENGGANOSORLIM', date '2025-11-27', 68),
    ('VERBEEKOFFICEENGGANOSORLIM', date '2026-02-09', 95),
    ('VERBEEKOFFICEENGGANOSORLIM', date '2026-06-08', 97),
    ('MOBILERUSHASSAYLABMRAL', date '2025-11-27', 82),
    ('MOBILERUSHASSAYLABMRAL', date '2026-02-09', 90),
    ('MOBILERUSHASSAYLABMRAL', date '2026-06-08', 97),
    ('RUMAHSAKITINCOOLDBUILDING', date '2025-11-27', 77),
    ('RUMAHSAKITINCOOLDBUILDING', date '2026-02-09', 95),
    ('RUMAHSAKITINCOOLDBUILDING', date '2026-06-08', 97),
    ('TRANSFERPOINT', date '2025-11-27', 32),
    ('TRANSFERPOINT', date '2026-02-09', 45),
    ('TRANSFERPOINT', date '2026-06-08', 45),
    ('MEMWORKSHOPPARKINGPOOL', date '2025-11-27', 82),
    ('MEMWORKSHOPPARKINGPOOL', date '2026-02-09', 95),
    ('MEMWORKSHOPPARKINGPOOL', date '2026-06-08', 97),
    ('MEMWORKSHOPGATEENGGANO', date '2025-11-27', 32),
    ('MEMWORKSHOPGATEENGGANO', date '2026-02-09', 45),
    ('MEMWORKSHOPGATEENGGANO', date '2026-06-08', 90),
    ('MINEOFFICEEXTENTION', date '2025-11-27', 40),
    ('MINEOFFICEEXTENTION', date '2026-02-09', 45),
    ('MINEOFFICEEXTENTION', date '2026-06-08', 90),
    ('CAMPENGGANO', date '2025-11-27', 82),
    ('CAMPENGGANO', date '2026-02-09', 95),
    ('CAMPENGGANO', date '2026-06-08', 97),
    ('IMPROVEMENTYPSBLOCK12SEKTUMBUHKEMBANG', date '2026-02-09', 35),
    ('IMPROVEMENTYPSBLOCK12SEKTUMBUHKEMBANG', date '2026-06-08', 40),
    ('IMPROVEMENTYPSBLOCK10MUSHOLLA', date '2026-02-09', 35),
    ('IMPROVEMENTYPSBLOCK10MUSHOLLA', date '2026-06-08', 60),
    ('BUILDINGFACILITYIMPRLKSBIPARTITE', date '2026-02-09', 40),
    ('BUILDINGFACILITYIMPRLKSBIPARTITE', date '2026-06-08', 40),
    ('INSTALLATIONOFOHCRANEBALANTANGSHOP', date '2026-02-09', 40),
    ('INSTALLATIONOFOHCRANEBALANTANGSHOP', date '2026-06-08', 60),
    ('RENOVASITRANSPORTOFFICEBUILDING1', date '2025-11-27', 82),
    ('RENOVASITRANSPORTOFFICEBUILDING1', date '2026-02-09', 95),
    ('RENOVASITRANSPORTOFFICEBUILDING1', date '2026-06-08', 97),
    ('RENOVASITRANSPORTOFFICEBUILDING2', date '2025-11-27', 32),
    ('RENOVASITRANSPORTOFFICEBUILDING2', date '2026-02-09', 95),
    ('RENOVASITRANSPORTOFFICEBUILDING2', date '2026-06-08', 97),
    ('VALEOFFICEMAKASSAR', date '2026-02-09', 60),
    ('VALEOFFICEMAKASSAR', date '2026-06-08', 80),
    ('RENOVASIROOFTOPADDITIONALOFFICE', date '2026-02-09', 60),
    ('RENOVASIROOFTOPADDITIONALOFFICE', date '2026-06-08', 80),
    ('MENARANDB', date '2025-11-27', 82),
    ('MENARANDB', date '2026-02-09', 95),
    ('MENARANDB', date '2026-06-08', 97),
    ('MENARAHYDROLARONA', date '2025-11-27', 82),
    ('MENARAHYDROLARONA', date '2026-02-09', 95),
    ('MENARAHYDROLARONA', date '2026-06-08', 97),
    ('MENARAHIMALAYASITE', date '2025-11-27', 82),
    ('MENARAHIMALAYASITE', date '2026-02-09', 95),
    ('MENARAHIMALAYASITE', date '2026-06-08', 97),
    ('MENARAASULISITE', date '2025-11-27', 82),
    ('MENARAASULISITE', date '2026-02-09', 95),
    ('MENARAASULISITE', date '2026-06-08', 97),
    ('MENARAHYDROKAREBBE', date '2025-11-27', 82),
    ('MENARAHYDROKAREBBE', date '2026-02-09', 95),
    ('MENARAHYDROKAREBBE', date '2026-06-08', 97),
    ('MENARAMANGKASAPOINT', date '2025-11-27', 82),
    ('MENARAMANGKASAPOINT', date '2026-06-08', 97),
    ('MENARABALANTANGPORT', date '2025-11-27', 82),
    ('MENARABALANTANGPORT', date '2026-02-09', 95),
    ('MENARABALANTANGPORT', date '2026-06-08', 97),
    ('RENOVASIOFFICENURSERY', date '2026-06-08', 40),
    ('WOODENHOUSENURSERY', date '2026-06-08', 40),
    ('MUSHOLLAHNURSERY', date '2026-06-08', 40),
    ('LUNCHROOMNURSERY', date '2026-06-08', 40),
    ('RTHNURSERY', date '2026-06-08', 40),
    ('NURSERYWAREHOUSE', date '2026-06-08', 40),
    ('MUSHOLLAHBALANTANGLAP3JUN2026', date '2026-06-08', 40),
    ('NEWELECTRICBOILERPHASE2', date '2026-06-08', 30)
)
insert into public.project_progress (project_id, report_date, progress_percent, description)
select p.id, d.report_date, d.pct, 'Update progres (rekap VALE)'
from data d
join public.projects p
  on p.client_id = (select id from vale)
 and regexp_replace(upper(p.name), '[^A-Z0-9]', '', 'g') = d.norm_name
where not exists (
  select 1 from public.project_progress pp
  where pp.project_id = p.id and pp.report_date = d.report_date
);
