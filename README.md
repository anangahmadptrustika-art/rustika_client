# CLIENT RUSTIKA CONSULTANT

> **Client Project Management Portal** — pusat informasi seluruh proyek konsultan,
> arsitektur, sipil, survey, pemetaan drone, kajian teknis, SIMBG, dan dokumen
> proyek Rustika Consultant.

Aplikasi web **enterprise SaaS** yang scalable, secure, dan siap mengelola
ratusan client serta ribuan dokumen proyek.

![Tech](https://img.shields.io/badge/Next.js-15-black)
![Tech](https://img.shields.io/badge/TypeScript-5-blue)
![Tech](https://img.shields.io/badge/Supabase-Postgres-3FCF8E)
![Tech](https://img.shields.io/badge/TailwindCSS-3-38BDF8)

---

## ✨ Tujuan

1. Client memonitor progres proyek **real-time**.
2. Tim internal mengupload dokumen, foto, laporan, dan progres pekerjaan.
3. Semua data tersimpan **terstruktur dan terdokumentasi**.
4. Mengurangi komunikasi yang tercecer melalui WhatsApp.
5. Menjadi **pusat informasi** seluruh proyek Rustika Consultant.

---

## 🧱 Tech Stack

| Layer        | Teknologi                                            |
| ------------ | ---------------------------------------------------- |
| Frontend     | Next.js 15 (App Router), TypeScript, React 19        |
| Styling      | Tailwind CSS, Shadcn UI (Radix), Framer Motion       |
| Charts       | Recharts                                             |
| Backend      | Supabase (PostgreSQL, Auth, Storage)                 |
| Security     | Row Level Security (RLS) + RBAC matrix               |
| AI           | Anthropic Claude API (assistant, ringkasan, laporan) |
| Deployment   | Vercel                                               |

Tema desain: **Modern Enterprise / Premium Dashboard** dengan palet
**Hitam · Kuning Emas · Putih** (referensi: Procore, Autodesk Construction Cloud,
Monday.com, ClickUp, Notion).

---

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. (Opsional) Salin env. Tanpa env, aplikasi berjalan dalam DEMO MODE
#    dengan data contoh — semua halaman bisa dijelajahi tanpa backend.
cp .env.example .env.local

# 3. Jalankan dev server
npm run dev
# → http://localhost:3000
```

### Mode Demo vs Mode Produksi

- **Demo Mode** (default jika `NEXT_PUBLIC_SUPABASE_*` belum diisi): aplikasi
  memakai data contoh dari `src/lib/demo-data.ts`. Login otomatis sebagai
  Super Admin. Cocok untuk review UI/UX tanpa provisioning.
- **Production Mode**: setelah env Supabase diisi, seluruh data dialirkan dari
  Supabase dengan RLS aktif. Lihat [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

---

## 👥 Role & Hak Akses

| Peran               | Ringkasan                                                            |
| ------------------- | ------------------------------------------------------------------- |
| **Super Admin**     | Semua data, client, proyek, invoice, dokumen, laporan, manajemen user |
| **Project Manager** | Buat proyek, atur tim & progres, upload dokumen, lihat proyek yang ditugaskan |
| **Staff**           | Upload dokumen/foto, update progres, buat laporan. **Tanpa data keuangan** |
| **Client**          | Lihat proyek miliknya, download, progres, invoice, komentar, approval |

Matriks lengkap: [`docs/ROLES.md`](docs/ROLES.md) — juga ditegakkan di
[`src/lib/rbac.ts`](src/lib/rbac.ts) (UI) dan
[`supabase/migrations/0002_rls.sql`](supabase/migrations/0002_rls.sql) (database).

---

## 🗂️ Modul Aplikasi

**Dashboard** — Total/Active/Completed Project, Average Progress, Pending Approval,
Outstanding Invoice + grafik Progress Bulanan, Status Proyek, Progress per Divisi.

**Project Detail (12 tab)**:
Overview · Kajian Teknis · SIMBG Drawing · Survey · Drone Mapping · Capture Images
· Data Luasan · Progress Report · Timeline Activity · Invoice · Approval · Discussion.

**Lainnya**: Global Search, Notification Center, AI Assistant, Manajemen Client &
User.

---

## 📁 Struktur Folder

```
rustika_client/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── (app)/                # Area terproteksi (sidebar + header)
│   │   │   ├── dashboard/
│   │   │   ├── projects/         # list + [id] detail (12 tab) + actions
│   │   │   ├── documents/  invoices/  clients/  users/
│   │   │   ├── notifications/  search/  assistant/  settings/
│   │   │   └── layout.tsx
│   │   ├── api/assistant/        # AI endpoint (Claude / fallback)
│   │   ├── auth/callback/        # OAuth & magic-link callback
│   │   ├── login/                # halaman + server actions auth
│   │   ├── page.tsx              # landing/marketing
│   │   ├── layout.tsx  globals.css  not-found.tsx
│   ├── components/
│   │   ├── ui/                   # komponen Shadcn (button, card, dialog, …)
│   │   ├── layout/               # sidebar, header, mobile-nav, menus
│   │   ├── projects/             # tab content & project widgets
│   │   ├── charts/               # recharts wrappers
│   │   ├── shared/  brand/  auth/  assistant/
│   ├── lib/
│   │   ├── supabase/             # client / server / middleware
│   │   ├── queries.ts            # data-access layer (demo ⇄ live)
│   │   ├── rbac.ts  constants.ts  navigation.ts  auth.ts  utils.ts
│   │   └── demo-data.ts  config.ts
│   ├── types/database.ts         # tipe DB (mirror SQL)
│   └── middleware.ts             # refresh sesi + guard auth
├── supabase/
│   ├── migrations/               # 0001 schema · 0002 RLS · 0003 storage
│   └── seed.sql
└── docs/                         # ARCHITECTURE · DATABASE · DEPLOYMENT · ROLES
```

---

## 📚 Dokumentasi

| Dokumen | Isi |
| ------- | --- |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Arsitektur sistem, struktur folder, API structure, auth flow, wireframe |
| [`docs/DATABASE.md`](docs/DATABASE.md)         | ERD, skema tabel, relasi, RLS |
| [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)     | Setup Supabase + deploy ke Vercel |
| [`docs/ROLES.md`](docs/ROLES.md)               | Role permission matrix lengkap |

---

## 🧪 Scripts

```bash
npm run dev        # development
npm run build      # production build
npm run start      # jalankan hasil build
npm run lint       # eslint
npm run typecheck  # tsc --noEmit
```

---

## 🔐 Keamanan

- **Row Level Security** pada seluruh tabel — client tidak bisa melihat proyek
  client lain; staff tidak bisa melihat keuangan.
- **RBAC** di sisi UI menyembunyikan aksi yang tidak diizinkan.
- Session di-refresh otomatis melalui `middleware.ts`.
- Service-role key hanya dipakai di server (`createAdminClient`).

---

© Rustika Consultant. Dibuat dengan standar enterprise SaaS.
