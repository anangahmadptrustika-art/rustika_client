# Database Schema — CLIENT RUSTIKA CONSULTANT

PostgreSQL (Supabase). Migrasi: [`supabase/migrations`](../supabase/migrations).

- `0001_schema.sql` — enums, tabel, index, trigger
- `0002_rls.sql` — Row Level Security + helper functions
- `0003_storage.sql` — bucket & policy storage
- `seed.sql` — data contoh untuk dev

## 1. Entity Relationship Diagram

```
                         ┌────────────┐
                         │ auth.users │ (Supabase Auth)
                         └─────┬──────┘
                               │ 1:1 (trigger handle_new_user)
                         ┌─────▼──────┐         ┌────────────┐
                         │  profiles  │────────►│  clients   │
                         │  role,     │ client_id└─────┬──────┘
                         │  client_id │               │ 1:N
                         └─────┬──────┘               │
            project_manager_id │            ┌─────────▼─────────┐
                               └───────────►│     projects      │
                                            │ code, status,     │
                                            │ progress, ...     │
                                            └─────────┬─────────┘
        ┌──────────────┬──────────────┬──────────────┼───────────────┬───────────────┐
        │ 1:N          │ 1:N          │ 1:N          │ 1:N           │ 1:N           │ 1:N
┌───────▼───────┐ ┌────▼─────────┐ ┌──▼────────────┐ ┌▼───────────┐ ┌▼────────────┐ ┌▼──────────┐
│project_members│ │project_      │ │project_images │ │project_    │ │ area_data   │ │ invoices  │
│ user_id       │ │documents     │ │ category,tags │ │progress    │ │ kdb,klb,... │ │ status    │
└───────────────┘ │ category,ver │ └───────────────┘ │ percent    │ └─────────────┘ └───────────┘
                  └──────┬───────┘                    └────────────┘
                         │ 1:N (optional)
        ┌────────────────┼────────────────┬────────────────┬───────────────┐
 ┌──────▼──────┐  ┌──────▼──────┐  ┌───────▼──────┐  ┌──────▼──────┐  ┌─────▼──────┐
 │  approvals  │  │  comments   │  │  activities  │  │notifications│  │  (storage) │
 │ document_id │  │ parent_id   │  │ type,entity  │  │ user_id     │  │  objects   │
 │ status      │  │ (threads)   │  │ (audit log)  │  │ is_read     │  │            │
 └─────────────┘  └─────────────┘  └──────────────┘  └─────────────┘  └────────────┘
```

## 2. Enums

| Enum | Nilai |
| ---- | ----- |
| `user_role` | super_admin, project_manager, staff, client |
| `staff_category` | surveyor, architect, drafter, engineer, admin |
| `project_status` | planning, survey, design, simbg, review, construction_support, completed, on_hold |
| `document_category` | kajian_teknis, simbg, survey, drone, invoice, other |
| `image_category` | existing, survey, progress, final |
| `invoice_status` | draft, sent, paid, overdue |
| `approval_status` | pending, approved, revision_requested |
| `activity_type` | upload, progress, approval, comment, login, project, invoice, member |
| `notification_type` | document_uploaded, progress_updated, approval_required, invoice_created, comment_added, mention |

## 3. Tabel Inti

### profiles
1:1 dengan `auth.users`. Menyimpan `role`, `staff_category`, dan `client_id`
(untuk user berperan client).

### clients
Master client. `projects.client_id` → `clients.id` (restrict on delete).

### projects
Entitas pusat. `progress` adalah cache dari laporan progress terbaru
(di-maintain trigger `sync_project_progress`). Disimpan juga `project_manager_id`
dan `created_by`.

### project_members
Junction `projects` ↔ `profiles` (tim internal per proyek). Unik `(project_id, user_id)`.

### project_documents
Dokumen dengan `category`, `subcategory` (mis. Arsitektur/Struktur untuk SIMBG),
`version` untuk version control, dan `file_path` (Supabase Storage).

### project_images
Galeri foto: `category` (existing/survey/progress/final), `tags text[]`
(GIN-indexed untuk filter & search), `taken_at`.

### project_progress
Laporan progres: `report_date`, `progress_percent`, `division`, `description`,
`obstacle`, `solution`, `documentation_urls[]`. Trigger menyinkronkan
`projects.progress` ke laporan terbaru.

### area_data
Data luasan: `luas_site`, `luas_bangunan`, `luas_lantai`, `kdb`, `klb`, `kdh`,
`gsb`.

### invoices
`invoice_number`, `termin`, `amount`, `issue_date`, `due_date`, `status`, +
URL `invoice_file`, `receipt_file`, `tax_file`. Fungsi `mark_overdue_invoices()`
menandai `sent` → `overdue` lewat scheduled job.

### approvals
Permintaan persetujuan; client merespons (`approved` / `revision_requested`)
dengan `response_note`. Komentar tersimpan permanen.

### comments
Diskusi per proyek, mendukung thread (`parent_id`), `mentions uuid[]`, lampiran.

### activities
Audit log / timeline. Diisi aplikasi (dan dapat oleh trigger). Read-only via RLS.

### notifications
Per-user; tipe upload/progress/approval/invoice/comment/mention; `is_read`.

## 4. Index

B-tree pada FK & kolom filter (status, client, project), **GIN** untuk
`project_images.tags`, dan **GIN tsvector** untuk full-text search di
`projects` dan `project_documents` (mendukung Global Search & AI).

## 5. Trigger & Fungsi

| Objek | Fungsi |
| ----- | ------ |
| `handle_new_user()` | Membuat `profiles` saat user auth dibuat. |
| `set_updated_at()` | Memelihara kolom `updated_at`. |
| `sync_project_progress()` | Update `projects.progress` dari laporan terbaru. |
| `mark_overdue_invoices()` | Tandai invoice jatuh tempo (untuk pg_cron). |
| `current_role()`, `current_client_id()`, `is_super_admin()`, `can_access_project()`, `can_edit_project()` | Helper `SECURITY DEFINER` untuk RLS (mencegah rekursi policy). |

## 6. Row Level Security (ringkas)

| Tabel | SELECT | INSERT/UPDATE/DELETE |
| ----- | ------ | -------------------- |
| projects | super admin / PM / member / client pemilik | super admin & PM (insert), PM proyek (update), super admin (delete) |
| project_documents / images / progress / area_data | siapa pun yang bisa akses proyek | super admin / PM / staff member |
| invoices | akses proyek **dan bukan staff** | super admin / PM proyek |
| approvals | akses proyek | tim (insert), client/tim (update) |
| comments | akses proyek | penulis sendiri |
| notifications | hanya milik sendiri | milik sendiri |

Detail penuh: [`0002_rls.sql`](../supabase/migrations/0002_rls.sql).

## 7. Regenerasi Tipe TypeScript

```bash
supabase gen types typescript --project-id <ref> > src/types/database.ts
```
