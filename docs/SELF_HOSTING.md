# Self-Hosting — Memindahkan Rustika Client ke Server Sendiri

> Project Vercel sudah **terhapus** (bukan sekadar di-pause), jadi aplikasi sekarang
> dijalankan di server sendiri. Panduan ini dari nol sampai bisa diakses client.

## 0. Gambaran

| Komponen | Sebelum | Sesudah |
|---|---|---|
| Aplikasi Next.js | Vercel | **Server sendiri** (Docker) |
| Database + Auth + RLS | Supabase (cloud) | **Tetap** Supabase |
| File dokumen/foto | Cloudinary | **Tetap** Cloudinary |
| AI Assistant | Anthropic API | **Tetap** |
| HTTPS / domain | `*.vercel.app` | **Domain sendiri** via Cloudflare Tunnel **atau** Caddy |

Yang berpindah hanya *aplikasi*-nya. Data (Supabase) dan file (Cloudinary) tidak perlu dimigrasi.

### Checklist singkat
- [ ] Kumpulkan semua env (Langkah 1) — nilai lama di Vercel **hilang**
- [ ] Server: Docker + Compose, clone repo, buat `.env`
- [ ] Jalankan: `--profile tunnel` (di balik NAT) **atau** `--profile caddy` (IP publik)
- [ ] Supabase Auth → Site URL & Redirect URLs ke domain baru
- [ ] Apps Script → `ENDPOINT_URL` + `SYNC_SECRET` baru
- [ ] Cek `https://DOMAIN/api/status` → JSON `status: ok`

---

## 1. Kumpulkan env var (WAJIB, karena Vercel sudah hilang)

Buat file `.env` di server dari template:

```bash
cp .env.server.example .env
chmod 600 .env
```

Isi nilainya dari sumber berikut:

| Var | Ambil dari |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Supabase → **Project Settings → API** |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Cloudinary → **Dashboard → Product Environment** |
| `ANTHROPIC_API_KEY` (opsional) | console.anthropic.com |
| `SYNC_SECRET` | **Buat baru**: `openssl rand -hex 32` |
| `APP_DOMAIN`, `NEXT_PUBLIC_SITE_URL` | domain baru, mis. `app.rustika.co.id` / `https://app.rustika.co.id` |
| `CLOUDFLARE_TUNNEL_TOKEN` | hanya jika pakai Cloudflare Tunnel (Langkah 3A) |

> ⚠️ `SUPABASE_SERVICE_ROLE_KEY` dan `CLOUDINARY_API_SECRET` adalah rahasia server.
> Jangan pernah dimasukkan ke browser/commit. Jika kamu curiga nilai lama pernah
> bocor, **rotasi** di dashboard masing-masing.

> ℹ️ Kalau `NEXT_PUBLIC_SUPABASE_*` kosong, app otomatis masuk **DEMO MODE**
> (data contoh, bukan data asli). Kalau setelah deploy kamu melihat proyek
> "Kantor VALE Sorowako" dll, berarti env Supabase belum terbaca.

---

## 2. Siapkan server

Contoh: VM Ubuntu 22.04/24.04 di Proxmox (2 vCPU, 2 GB RAM, 20 GB disk cukup).

```bash
# Docker + Compose
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER && newgrp docker

# Ambil kode
git clone https://github.com/anangahmadptrustika-art/rustika_client.git
cd rustika_client
cp .env.server.example .env && chmod 600 .env
nano .env   # isi sesuai Langkah 1
```

---

## 3. Jalankan — pilih salah satu

### 3A. Di balik NAT / rumah / kantor → **Cloudflare Tunnel** (disarankan)
Tanpa buka port di router, HTTPS otomatis, gratis.

1. Cloudflare Dashboard → **Zero Trust → Networks → Tunnels → Create a tunnel** (Cloudflared).
2. Salin **token**-nya ke `CLOUDFLARE_TUNNEL_TOKEN` di `.env`.
3. Di tab **Public Hostname** tunnel: `Subdomain` = `app`, `Domain` = domainmu,
   `Service` = **HTTP** → `app:3000`  (nama service Docker, bukan localhost).
4. Jalankan:
   ```bash
   docker compose --profile tunnel up -d --build
   ```

### 3B. Punya IP publik & bisa buka port 80/443 → **Caddy** (HTTPS Let's Encrypt otomatis)
1. Buat DNS **A record** `app.domainmu` → IP publik server.
2. Buka port 80 & 443 di firewall/router ke server.
3. Pastikan `APP_DOMAIN=app.domainmu` di `.env`.
4. Jalankan:
   ```bash
   docker compose --profile caddy up -d --build
   ```

### 3C. Tanpa Docker (Node + PM2)
```bash
# Node 22
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt-get install -y nodejs
npm ci && npm run build            # membaca .env (Next.js memuat .env otomatis)
sudo npm i -g pm2
pm2 start npm --name rustika-client -- start   # jalan di :3000
pm2 save && pm2 startup                         # auto-start saat reboot
```
Lalu pasang reverse proxy di host: **cloudflared** (`Service` → `http://localhost:3000`)
atau **Caddy** dengan `reverse_proxy 127.0.0.1:3000`.

---

## 4. Konfigurasi pasca-migrasi (domain berubah)

1. **Supabase → Authentication → URL Configuration**
   - **Site URL**: `https://app.domainmu`
   - **Redirect URLs**: tambahkan `https://app.domainmu/**`
   (Kalau ini terlewat: login berhasil tapi diarahkan ke URL lama / error redirect.)
2. **Google Sheet → Extensions → Apps Script** (`docs/google-sheet-sync.gs`):
   - `ENDPOINT_URL = "https://app.domainmu/api/sync/projects"`
   - `SYNC_SECRET` = nilai baru yang sama dengan di `.env`.
3. **`NEXT_PUBLIC_SITE_URL`** sudah di `.env` → dipakai untuk link/QR portal client.
4. (Hanya jika masih pakai Supabase Storage/R2 lama & bucket-nya membatasi CORS ke
   `vercel.app`) tambahkan origin domain baru di setting bucket.
5. Cloudinary & Anthropic: **tidak ada** yang perlu diubah.

---

## 5. Verifikasi

```bash
curl -s https://app.domainmu/api/status      # harus JSON {"status":"ok",...}
docker compose ps                             # app: healthy
docker compose logs -f app                    # lihat log
```
Lalu cek manual: login admin → Proyek → buka satu proyek → **preview PDF**, **upload**
foto/dokumen, **AI Assistant**, **portal client** (link QR), dan **Sync ke Aplikasi** dari Sheet.

---

## 6. Operasional

**Update ke versi terbaru**
```bash
git pull
docker compose --profile tunnel up -d --build   # atau --profile caddy
```

**Log / restart**
```bash
docker compose logs -f app
docker compose restart app
```

**Backup**: database & file ada di Supabase/Cloudinary (backup dari dashboard mereka).
Di server cukup amankan `.env` (satu-satunya yang tidak ada di git).

**Keamanan** (sesuai `.claude/rules/security.md`)
- `.env` hanya bisa dibaca owner (`chmod 600`), tidak pernah di-commit.
- Container jalan sebagai user non-root; port 3000 hanya terbuka ke localhost.
- Mode Tunnel: **tidak perlu** port masuk sama sekali. Mode Caddy: buka hanya 80/443 (`ufw allow 80,443/tcp`).
- Security headers (CSP, HSTS, X-Frame-Options, dll) sudah di `next.config.mjs`.
- Update rutin: `git pull` + rebuild; `docker compose pull` untuk image caddy/cloudflared.

---

## 7. Troubleshooting

| Gejala | Penyebab / solusi |
|---|---|
| Tampil data contoh ("Kantor VALE Sorowako") | `NEXT_PUBLIC_SUPABASE_*` kosong saat **build** — isi `.env`, lalu `docker compose up -d --build` (build ulang wajib karena `NEXT_PUBLIC_*` ditanam saat build). |
| Login berhasil tapi redirect error / balik ke login | Supabase **Site URL / Redirect URLs** belum ke domain baru (Langkah 4.1). |
| Sync Sheet gagal 401 | `SYNC_SECRET` di Apps Script ≠ di `.env`. |
| Sync Sheet gagal (HTTP 0 / DNS) | `ENDPOINT_URL` masih `vercel.app`. |
| Gambar `next/image` error | `sharp` sudah termasuk di image; pastikan build ulang. |
| Caddy tidak dapat sertifikat | DNS A record belum mengarah ke server / port 80 & 443 belum terbuka. |
| Tunnel "unhealthy" | `CLOUDFLARE_TUNNEL_TOKEN` salah, atau Public Hostname belum diarahkan ke `app:3000`. |
