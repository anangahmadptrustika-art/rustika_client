# Arsitektur Sistem — CLIENT RUSTIKA CONSULTANT

## 1. Gambaran Umum

Aplikasi adalah **Next.js 15 App Router** monolith yang berbicara langsung ke
**Supabase** (PostgreSQL + Auth + Storage). Tidak ada server backend terpisah —
logika server dijalankan via **Server Components**, **Server Actions**, dan
**Route Handlers**. Otorisasi data ditegakkan di lapisan database melalui
**Row Level Security (RLS)**, sehingga aman walau diakses dari berbagai client.

```
┌──────────────────────────────────────────────────────────────────────┐
│                              BROWSER                                    │
│   Next.js (React 19) · Shadcn UI · Framer Motion · Recharts            │
└───────────────┬───────────────────────────────────┬───────────────────┘
                │  RSC payload / Server Actions       │  fetch /api/assistant
                ▼                                     ▼
┌──────────────────────────────────────────┐   ┌──────────────────────────┐
│        NEXT.JS (Vercel Edge/Node)         │   │  AI Route Handler         │
│  • Server Components  (read data)         │   │  /api/assistant           │
│  • Server Actions     (mutations)         │   │  → Anthropic Claude API   │
│  • middleware.ts      (refresh session)   │   │  (fallback: local search) │
│  • lib/queries.ts     (data-access layer) │   └──────────────────────────┘
└───────────────┬──────────────────────────┘
                │  @supabase/ssr (cookie-based auth)
                ▼
┌──────────────────────────────────────────────────────────────────────┐
│                              SUPABASE                                   │
│  Auth (JWT)  ·  PostgreSQL + RLS  ·  Storage (documents/images/avatars)│
│  Triggers: handle_new_user, sync_project_progress, set_updated_at      │
└──────────────────────────────────────────────────────────────────────┘
```

## 2. Prinsip Desain

- **Server-first**: data dibaca di Server Components; mutasi lewat Server Actions.
- **Single data-access layer**: `src/lib/queries.ts` adalah satu-satunya tempat
  query. Setiap fungsi mengembalikan bentuk yang sama baik di **DEMO_MODE**
  (data contoh) maupun **live** (Supabase). Halaman tidak perlu berubah saat
  beralih ke produksi.
- **Defense in depth**: RBAC di UI (`lib/rbac.ts`) + RLS di DB (`0002_rls.sql`).
- **Progressive**: tanpa env Supabase aplikasi tetap jalan (demo), sehingga mudah
  direview / didemokan.

## 3. Struktur Folder

Lihat ringkasan di [README](../README.md#-struktur-folder). Konvensi penting:

| Path | Tanggung jawab |
| ---- | -------------- |
| `app/(app)/*` | Halaman terproteksi; `layout.tsx` memuat sidebar + header dan memanggil `requireProfile()`. |
| `app/login`, `app/auth/callback` | Alur autentikasi. |
| `lib/supabase/{client,server,middleware}.ts` | Tiga varian Supabase client sesuai konteks eksekusi. |
| `lib/queries.ts` | Data-access (demo ⇄ live). |
| `lib/rbac.ts` | Permission matrix & guard. |
| `components/ui/*` | Primitif Shadcn (Radix). |
| `components/projects/*` | Konten 12 tab project detail. |

## 4. API Structure

Aplikasi memakai **Server Actions** (bukan REST controller) untuk mutasi, plus
satu Route Handler untuk AI. Ringkasan kontrak:

### Server Actions

| Action | File | Input | Akses |
| ------ | ---- | ----- | ----- |
| `signIn` / `signOut` | `app/login/actions.ts` | email, password | publik / authenticated |
| `createProject` | `app/(app)/projects/actions.ts` | field proyek | `project:create` |
| `updateProjectStatus` | `app/(app)/projects/actions.ts` | id, status | `project:edit` |
| `respondApproval` | `app/(app)/projects/[id]/actions.ts` | id, status, note | `approval:respond` (client) |
| `postComment` | `app/(app)/projects/[id]/actions.ts` | projectId, body | `comment:create` |

### Route Handlers

| Method & Path | Fungsi |
| ------------- | ------ |
| `POST /api/assistant` | AI assistant — ringkasan progres, pencarian dokumen NL, generate laporan. Body: `{ message: string }`. Memakai Claude API bila `ANTHROPIC_API_KEY` ada, jika tidak fallback ke pencarian lokal. |
| `GET /auth/callback` | Menukar `code` OAuth/magic-link menjadi session. |

### Data-access (read)

Semua read melalui fungsi di `lib/queries.ts`, mis. `getProjects()`,
`getProjectById(id)`, `getDashboardStats()`, `globalSearch(q)`,
`getProjectDocuments(id, category)`, dll.

## 5. Authentication Flow

```
                    ┌─────────────┐
   /login  ───────► │ signIn()    │  Server Action
                    │ Supabase    │  signInWithPassword
                    │ Auth        │
                    └──────┬──────┘
                           │ set cookies (sb-access / sb-refresh)
                           ▼
                    redirect /dashboard
                           │
   setiap request ─► middleware.ts ─► supabase.auth.getUser()
                           │
              ┌────────────┴─────────────┐
        user null                    user ada
              │                          │
   redirect /login?redirect=…    refresh session → next()
```

- **OAuth / Magic link**: provider mengembalikan ke `/auth/callback?code=…`
  → `exchangeCodeForSession` → redirect ke tujuan.
- **Profil & Role**: trigger `handle_new_user` membuat baris `profiles` saat user
  auth dibuat. `getCurrentProfile()` menggabungkan `auth.users` + `profiles`.
- **Proteksi route**: `middleware.ts` (coarse) + `requireProfile()` /
  `requireRole()` per halaman (fine).

## 6. Wireframe (low-fidelity)

### Dashboard
```
┌───────────────────────────────────────────────────────────────┐
│ Sidebar │  [search........]        🌓  🔔3   (avatar ▾)         │
│ ─────── ├───────────────────────────────────────────────────── │
│ Dashbrd │  Selamat datang, Ananda 👋                            │
│ Proyek  │  ┌─────┐┌─────┐┌─────┐┌─────┐┌─────┐┌─────┐          │
│ Dokumen │  │Total││Activ││Compl││Avg %││Pend ││Outst│  stat    │
│ Invoice │  └─────┘└─────┘└─────┘└─────┘└─────┘└─────┘          │
│ ─────── │  ┌──────────────────────┐ ┌──────────────┐          │
│ Search  │  │ Progress Bulanan ▲    │ │ Status Donut │          │
│ AI      │  └──────────────────────┘ └──────────────┘          │
│ Notif   │  ┌────────────┐ ┌──────────────────────────┐        │
│ ─────── │  │ Per Divisi │ │ Proyek Terbaru (list)     │        │
│ Clients │  └────────────┘ └──────────────────────────┘        │
│ Users   │  ┌──────────────────────────────────────────┐       │
│ Setting │  │ Aktivitas Terbaru (timeline)              │       │
└─────────┴───────────────────────────────────────────────────── ┘
```

### Project Detail
```
┌───────────────────────────────────────────────────────────────┐
│ ← Kembali ke daftar proyek                                      │
│ ┌───────────────────────────────────────────────────────────┐ │
│ │ RC-2025-001  [Design]      Kantor VALE Sorowako            │ │
│ │ Konsultan Arsitektur · PT Vale       Progress ▓▓▓▓▓░ 62%   │ │
│ └───────────────────────────────────────────────────────────┘ │
│ [Overview][Kajian][SIMBG][Survey][Drone][Images][Luasan]…(scroll)│
│ ┌───────────────────────────────────────────────────────────┐ │
│ │  ← konten tab aktif (tabel dokumen / galeri / chart / …)   │ │
│ └───────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────┘
```

### Login
```
┌───────────────────────────┬───────────────────────────┐
│  ███ Brand panel (gold)    │   Selamat datang kembali  │
│  "Kelola seluruh proyek"   │   Email  [____________]   │
│  ✓ real-time               │   Pass   [____________]   │
│  ✓ version control         │   [        Masuk        ] │
│  ✓ RLS · AI                │   ← Kembali ke beranda    │
└───────────────────────────┴───────────────────────────┘
```

## 7. Skalabilitas

- **Index** pada kolom filter umum (status, client, project) + **GIN** untuk
  full-text search & tag array (lihat `0001_schema.sql`).
- **Pagination** siap diterapkan pada query list (limit sudah dipakai pada feed).
- **Storage** memisahkan bucket documents/images/avatars; path diawali
  `project_id` agar policy storage konsisten dengan RLS.
- Stateless di sisi Next.js → mudah diskalakan horizontal di Vercel.
