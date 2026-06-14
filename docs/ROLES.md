# Role Permission Matrix — CLIENT RUSTIKA CONSULTANT

Sumber kebenaran: [`src/lib/rbac.ts`](../src/lib/rbac.ts) (UI) dan
[`supabase/migrations/0002_rls.sql`](../supabase/migrations/0002_rls.sql) (DB).

## Peran

1. **Super Admin** — akses penuh: semua data, client, proyek, invoice, dokumen,
   laporan, dan manajemen user.
2. **Project Manager** — membuat proyek, mengatur tim, mengatur progres, upload
   dokumen, melihat seluruh proyek yang ditugaskan.
3. **Staff** (Surveyor / Arsitek / Drafter / Engineer / Admin) — upload dokumen &
   foto, update progres, membuat laporan. **Tidak dapat melihat data keuangan.**
4. **Client** — hanya melihat proyek miliknya, download dokumen, melihat progres &
   invoice, memberi komentar dan approval. **Tidak dapat melihat proyek client lain.**

## Matriks

| Fitur                     | Super Admin | Project Manager | Staff | Client |
| ------------------------- | :---------: | :-------------: | :---: | :----: |
| Create Project            |     ✅      |       ✅        |  ❌   |   ❌   |
| Manage Team               |     ✅      |       ✅        |  ❌   |   ❌   |
| Upload Documents          |     ✅      |       ✅        |  ✅   |   ❌   |
| Download Documents        |     ✅      |       ✅        |  ✅   |   ✅   |
| Update Progress           |     ✅      |       ✅        |  ✅   |   ❌   |
| Create Report             |     ✅      |       ✅        |  ✅   |   ❌   |
| View Finance / Invoice    |     ✅      |       ✅        |  ❌   |   ✅   |
| Manage Invoice            |     ✅      |       ✅        |  ❌   |   ❌   |
| Request Approval          |     ✅      |       ✅        |  ❌   |   ❌   |
| Respond Approval          |     ✅      |       ❌        |  ❌   |   ✅   |
| Comment / Discussion      |     ✅      |       ✅        |  ✅   |   ✅   |
| Manage Clients            |     ✅      |       ✅        |  ❌   |   ❌   |
| Manage Users              |     ✅      |       ❌        |  ❌   |   ❌   |
| View All Projects         |     ✅      |       ❌        |  ❌   |   ❌   |

## Penegakan

- **UI** — `can(role, permission)` menyembunyikan tombol/menu; navigasi difilter
  per peran (`lib/navigation.ts`); tab **Invoice** disembunyikan dari staff.
- **Database (RLS)** — kebijakan menggunakan helper `SECURITY DEFINER`
  (`can_access_project`, `can_edit_project`, `current_role`, `current_client_id`).
  Contoh penting:
  - Client hanya bisa `SELECT` proyek dengan `client_id` = `client_id` profilnya.
  - `invoices` punya klausa `current_role() <> 'staff'` sehingga staff tidak bisa
    membaca keuangan, bahkan via API langsung.
  - `approvals.UPDATE` mengizinkan client merespons; `comments.INSERT` hanya untuk
    pemilik komentar (`user_id = auth.uid()`).
