# Self-Hosting — Rustika Client di Server Sendiri (termasuk database)

> Aplikasi **dan database** berjalan di server sendiri. Tidak ada lagi Supabase cloud:
> data proyek, akun login, dan API data semuanya ada di container Docker di server ini.
> Satu-satunya layanan luar yang masih dipakai: **Cloudinary** (penyimpanan file PDF/foto),
> **Cloudflare Tunnel** (akses HTTPS dari internet), dan (opsional) **Anthropic** (AI).

## ⚡ Cara tercepat — 1 perintah

Di server (Ubuntu/Debian), jalankan:
```bash
git clone -b main https://github.com/anangahmadptrustika-art/rustika_client.git && cd rustika_client && bash scripts/install.sh
```
Sudah pernah clone? `cd rustika_client && git checkout main && git pull && bash scripts/install.sh`

Installer akan:
1. memasang Docker (jika belum);
2. menanyakan **hanya** ini: domain, Cloudinary (3 nilai), Anthropic (opsional), token Cloudflare Tunnel;
3. membuat sendiri password database, JWT secret, API key, dan `SYNC_SECRET` → menulis `.env` (chmod 600);
4. build & menjalankan stack, menunggu semua *healthy*;
5. bertanya: **pindahkan data dari Supabase cloud** (disarankan) atau mulai kosong;
6. mencetak langkah terakhir (Cloudflare Public Hostname, Apps Script).

Siapkan sebelum mulai: nilai Cloudinary, token Cloudflare Tunnel, dan — untuk memindahkan data —
**connection string Supabase** (Session pooler) beserta password database-nya.

---

## 0. Gambaran

| Komponen | Sebelum | Sesudah |
|---|---|---|
| Aplikasi Next.js | Vercel | **Server sendiri** (container `app`) |
| Database | Supabase cloud | **Postgres 17 di server** (container `db`, data di `./data/db`) |
| Login / sesi | Supabase Auth | **GoTrue di server** (container `auth`) — password user ikut pindah |
| API data + RLS | Supabase REST | **PostgREST di server** (container `rest`), RLS tetap berlaku |
| Pintu masuk | — | **Caddy** (container `gateway`): `/supabase-api/*` → auth/rest, sisanya → app |
| File dokumen/foto | Cloudinary | **Tetap** Cloudinary |
| HTTPS / domain | `*.vercel.app` | `client.rustika.co.id` via Cloudflare Tunnel (atau Caddy langsung) |

Browser dan server memakai **satu domain**: API database dilayani di
`https://client.rustika.co.id/supabase-api/...`. Tidak ada port database yang terbuka ke internet.

---

## 1. Memindahkan data dari Supabase cloud

Dilakukan otomatis oleh installer (pilihan 1), atau kapan saja dengan:
```bash
bash scripts/migrate-from-supabase.sh
```
Yang diminta: **connection string** Supabase. Ambil di dashboard: *Project → tombol **Connect** →
Method **Session pooler** → salin URI*, ganti `[YOUR-PASSWORD]` dengan password database
(*Project Settings → Database*). Bentuknya:
```
postgresql://postgres.<ref>:<PASSWORD>@aws-0-<region>.pooler.supabase.com:5432/postgres
```
Script akan: menyalin skema + seluruh isi tabel aplikasi, menyalin akun login **beserta hash
password** (user login dengan password yang sama), lalu **memverifikasi jumlah baris** setiap
tabel (cloud vs lokal) dan menampilkannya. Aman diulang.

Jika di akhir muncul peringatan *"file lama masih di Supabase Storage"*, jalankan
`bash scripts/migrate-legacy-files.sh` (butuh Project URL + service_role key Supabase lama)
**sebelum** project Supabase dihapus. File akan dipindah ke Cloudinary.

**Hapus/pause project Supabase hanya setelah** login, proyek, dokumen, dan portal client dicek beres.

---

## 2. Langkah dashboard yang tersisa (sekali saja)

1. **Cloudflare Zero Trust → Networks → Tunnels → tunnel-mu → Public Hostname**
   - Subdomain `client`, Domain `rustika.co.id`, Service **HTTP** → `gateway:80`
   - (Bukan `app:3000` lagi — gateway yang membagi ke app dan API database.)
2. **Google Sheet → Extensions → Apps Script** (`docs/google-sheet-sync.gs`)
   - `ENDPOINT_URL = "https://client.rustika.co.id/api/sync/projects"`
   - `SYNC_SECRET` = nilai di `.env` (`grep ^SYNC_SECRET .env`)
3. Cek `https://client.rustika.co.id/api/status` → `{"status":"ok"}`, lalu login.

Tidak ada lagi pengaturan di Supabase (Site URL/Redirect diatur otomatis dari `.env`).

---

## 3. Mode jaringan

**3A. Cloudflare Tunnel (default, di balik NAT)** — tidak perlu buka port.
`bash scripts/install.sh` → `docker compose --profile tunnel up -d --build`.

**3B. Caddy langsung (punya IP publik, port 80/443 terbuka)**
DNS A record `client.rustika.co.id` → IP server, lalu `bash scripts/install.sh --caddy`.
Installer mengisi `CADDY_SITE_ADDRESS=client.rustika.co.id`, `CADDY_HTTP_BIND=0.0.0.0:80`,
`CADDY_HTTPS_BIND=0.0.0.0:443` di `.env`; Caddy mengambil sertifikat Let's Encrypt sendiri.
> CasaOS memakai port 80 untuk UI-nya — pindahkan dulu UI CasaOS ke port lain jika memilih mode ini.

---

## 4. Operasional

```bash
bash scripts/update.sh            # tarik versi terbaru (branch main) + rebuild
docker compose ps                 # semua harus healthy/running
docker compose logs -f app        # log aplikasi (auth / rest / db / gateway juga bisa)
docker compose restart app
```

**Backup database** (WAJIB — sekarang tanggung jawab sendiri, bukan Supabase):
```bash
bash scripts/db-backup.sh                       # → backups/rustika-<tanggal>.dump (simpan 14 terakhir)
bash scripts/db-restore.sh backups/rustika-....dump
```
Jadwalkan harian:
```bash
(crontab -l 2>/dev/null; echo "15 2 * * * cd $PWD && bash scripts/db-backup.sh >> backups/backup.log 2>&1") | crontab -
```
Salin folder `backups/` **dan file `.env`** ke tempat lain (Nextcloud, disk lain). Tanpa `.env`
(berisi password DB & JWT secret) backup tidak bisa dipakai di server baru.

**Akses SQL**
```bash
bash scripts/db.sh                              # psql interaktif (superuser)
bash scripts/db.sh -c "select count(*) from projects"
docker compose --profile tools up -d adminer    # UI web di http://IP-SERVER:8081 (hanya LAN)
#   System PostgreSQL · Server db · User postgres · Password = POSTGRES_PASSWORD di .env · DB postgres
```
Migrasi SQL baru (`supabase/migrations/00xx_*.sql`) dijalankan dengan
`bash scripts/db.sh -f - < supabase/migrations/00xx_nama.sql`.

**Mulai dari kosong** (tanpa data cloud): `bash scripts/db-migrate.sh && bash scripts/create-admin.sh`.

---

## 5. Cara kerja singkat (untuk yang penasaran)

```
internet ─HTTPS─▶ Cloudflare Tunnel ─▶ gateway (Caddy :80)
                                         ├─ /supabase-api/auth/v1/* ─▶ auth (GoTrue :9999) ─▶ db
                                         ├─ /supabase-api/rest/v1/* ─▶ rest (PostgREST :3000) ─▶ db
                                         └─ /*                      ─▶ app (Next.js :3000)
app (SSR) ─▶ http://gateway:8000/supabase-api  (jalur internal Docker, SUPABASE_INTERNAL_URL)
```
- Image `supabase/postgres` = Postgres 17 + role/skema yang sama dengan Supabase cloud, jadi
  **RLS policy, fungsi, dan trigger lama berjalan tanpa perubahan**.
- API key `anon`/`service_role` adalah JWT yang ditandatangani `JWT_SECRET` lokal (dibuat installer).
- Nama cookie sesi ditetapkan eksplisit (`sb-rustika-auth-token`) supaya browser (URL publik) dan
  server (URL internal) membaca sesi yang sama.

---

## 6. Keamanan (sesuai `.claude/rules/security.md`)

Sudah diterapkan:
- Port database **tidak** dipublikasikan; auth/rest hanya lewat gateway; app hanya menerima
  variabel yang dibutuhkannya (password DB & `JWT_SECRET` tidak diberikan ke container app).
- `.env` chmod 600, tidak pernah di-commit; rahasia dibuat acak oleh installer.
- Semua akses data tetap lewat RLS; `service_role` hanya di server.
- Sign-up publik dimatikan (`GOTRUE_DISABLE_SIGNUP=true`); akun dibuat admin dari aplikasi.
- Security headers (CSP, HSTS, dll) di `next.config.mjs`; HTTPS oleh Cloudflare/Caddy.

Belum tertangani (catatan):
- **Rate limit login** belum ada di gateway. Tambahkan *Rate Limiting Rule* di Cloudflare untuk
  path `/supabase-api/auth/v1/token` (mis. 10 permintaan/menit per IP).
- Reset password lewat email butuh SMTP (`SMTP_*` di `.env`); tanpa itu admin mengganti password
  user dari aplikasi.
- Backup bergantung pada cron di server — pastikan dijadwalkan dan disalin keluar server.

---

## 7. Troubleshooting

| Gejala | Penyebab / solusi |
|---|---|
| `dependency failed to start: rustika-auth is unhealthy` | `docker compose logs auth` — biasanya `POSTGRES_PASSWORD` di `.env` berubah setelah database dibuat. Kembalikan nilai lama (ada di `.env.bak.*`). |
| Login gagal "Invalid login credentials" padahal password benar | Migrasi akun belum jalan: `bash scripts/db.sh -c "select count(*) from auth.users"` harus > 0. Ulangi `bash scripts/migrate-from-supabase.sh`. |
| Halaman tampil data contoh ("Kantor VALE Sorowako") | `NEXT_PUBLIC_SUPABASE_*` kosong saat build — `bash scripts/install.sh --reconfigure` lalu build ulang. |
| `/api/status` OK tapi data kosong | Database belum diisi — jalankan migrasi (Bagian 1). |
| Migrasi: "Tidak bisa menyambung" | Pakai URI **Session pooler** (port 5432, bukan 6543); password database, bukan password akun Supabase. |
| Sync Sheet gagal 401 | `SYNC_SECRET` di Apps Script ≠ di `.env`. |
| Tunnel "unhealthy" / 502 | Public Hostname belum ke `gateway:80`, atau token salah. |
| Port 80 bentrok (mode Caddy) | CasaOS memakai port 80; pakai mode Tunnel atau pindahkan port CasaOS. |
| Ingin pindah server | Salin `.env` + `backups/*.dump` → server baru: `install.sh --skip-db` → `db-restore.sh`. |
