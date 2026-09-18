#!/usr/bin/env bash
# ============================================================================
# Rustika Client — installer "sekali jalan" untuk server sendiri (Ubuntu/Debian)
# Termasuk DATABASE di server ini (Postgres + auth + REST) — tanpa Supabase cloud.
#
#   git clone -b main https://github.com/anangahmadptrustika-art/rustika_client.git
#   cd rustika_client
#   bash scripts/install.sh               # mode Cloudflare Tunnel (default, di balik NAT)
#   bash scripts/install.sh --caddy       # mode Caddy (IP publik, port 80/443 terbuka)
#   bash scripts/install.sh --reconfigure # isi ulang .env (rahasia internal dipertahankan)
#   bash scripts/install.sh --skip-db     # jangan sentuh isi database
#
# Yang dilakukan: pasang Docker (jika belum) → tanya nilai yang perlu SEKALI
# (input rahasia tersembunyi) → buat otomatis password DB, JWT secret, API key,
# SYNC_SECRET → tulis .env (chmod 600) → build & jalankan stack → tunggu healthy
# → isi database (pindah dari Supabase cloud ATAU mulai kosong) → cetak langkah
# terakhir. Aman dijalankan ulang.
# ============================================================================
set -euo pipefail

MODE="tunnel"; RECONF=0; SKIP_DB=0
for a in "$@"; do
  case "$a" in
    --tunnel) MODE="tunnel" ;;
    --caddy) MODE="caddy" ;;
    --reconfigure) RECONF=1 ;;
    --skip-db) SKIP_DB=1 ;;
    -h|--help) sed -n '2,18p' "$0"; exit 0 ;;
    *) echo "Opsi tidak dikenal: $a (lihat --help)"; exit 1 ;;
  esac
done

cd "$(dirname "$0")/.."
ROOT="$(pwd)"
# shellcheck source=scripts/lib.sh
. "$ROOT/scripts/lib.sh"
DOMAIN_DEFAULT="client.rustika.co.id"

profile_args() { [[ "$MODE" == "tunnel" ]] && echo "--profile tunnel" || echo ""; }

# ── 1) Docker ───────────────────────────────────────────────────────────────
ensure_docker() {
  log "Cek Docker"
  if ! command -v docker >/dev/null 2>&1; then
    [[ -n "${DRY_RUN:-}" ]] && { warn "DRY_RUN: lewati instalasi Docker"; detect_compose; return; }
    log "Memasang Docker (script resmi get.docker.com)"
    curl -fsSL https://get.docker.com -o /tmp/get-docker.sh
    sudo sh /tmp/get-docker.sh
    rm -f /tmp/get-docker.sh
    sudo usermod -aG docker "$USER" || true
  fi
  detect_compose
  [[ "$DC" == sudo* ]] && warn "docker butuh sudo di sesi ini (login ulang agar grup 'docker' aktif)"
  ok "Docker siap ($DC)"
}

# ── 2) .env ─────────────────────────────────────────────────────────────────
# API key anon/service_role = JWT HS256 yang ditandatangani JWT_SECRET (persis
# seperti kunci API Supabase), dibuat lokal dengan openssl.
b64url() { openssl base64 -e -A | tr '+/' '-_' | tr -d '='; }
make_jwt() {   # make_jwt <role> <iat> <exp>
  local h p s
  h="$(printf '{"alg":"HS256","typ":"JWT"}' | b64url)"
  p="$(printf '{"role":"%s","iss":"supabase","iat":%s,"exp":%s}' "$1" "$2" "$3" | b64url)"
  s="$(printf '%s.%s' "$h" "$p" | openssl dgst -sha256 -hmac "$JWT_SECRET" -binary | b64url)"
  printf '%s.%s.%s' "$h" "$p" "$s"
}

write_env() {
  if [[ -f .env && $RECONF -eq 0 ]]; then
    if [[ -n "$(env_get POSTGRES_PASSWORD)" ]]; then
      ok ".env sudah ada — dipakai (gunakan --reconfigure untuk isi ulang)"; return
    fi
    warn ".env lama (versi Supabase cloud) ditemukan — dilengkapi untuk database lokal"
  fi
  log "Konfigurasi .env (rahasia diketik tersembunyi; tidak ditampilkan & tidak dicatat)"
  command -v openssl >/dev/null || die "openssl tidak ada: sudo apt-get install -y openssl"

  # nilai lama (jika ada) jadi default → jalan ulang tidak perlu ketik ulang
  local o_domain o_site o_cname o_ckey o_csecret o_akey o_model o_token
  o_domain="$(env_get APP_DOMAIN)"; o_site="$(env_get NEXT_PUBLIC_SITE_URL)"
  o_cname="$(env_get CLOUDINARY_CLOUD_NAME)"; o_ckey="$(env_get CLOUDINARY_API_KEY)"
  o_csecret="$(env_get CLOUDINARY_API_SECRET)"; o_akey="$(env_get ANTHROPIC_API_KEY)"
  o_model="$(env_get ANTHROPIC_MODEL)"; o_token="$(env_get CLOUDFLARE_TUNNEL_TOKEN)"

  ask APP_DOMAIN "Domain aplikasi" "${o_domain:-$DOMAIN_DEFAULT}"
  ask NEXT_PUBLIC_SITE_URL "Site URL" "${o_site:-https://$APP_DOMAIN}"
  NEXT_PUBLIC_SITE_URL="${NEXT_PUBLIC_SITE_URL%/}"

  echo; echo "Cloudinary → Dashboard → Product Environment (penyimpanan file dokumen & foto)"
  ask CLOUDINARY_CLOUD_NAME "CLOUDINARY_CLOUD_NAME" "$o_cname"
  ask CLOUDINARY_API_KEY "CLOUDINARY_API_KEY" "$o_ckey"
  if [[ -n "$o_csecret" ]]; then ask_secret CLOUDINARY_API_SECRET "CLOUDINARY_API_SECRET" "keep:$o_csecret"
  else ask_secret CLOUDINARY_API_SECRET "CLOUDINARY_API_SECRET"; fi

  echo; echo "Anthropic (opsional — kosongkan jika AI Assistant tidak dipakai)"
  if [[ -n "$o_akey" ]]; then ask_secret ANTHROPIC_API_KEY "ANTHROPIC_API_KEY" "keep:$o_akey"
  else ask_secret ANTHROPIC_API_KEY "ANTHROPIC_API_KEY" optional; fi
  ask ANTHROPIC_MODEL "ANTHROPIC_MODEL" "${o_model:-claude-sonnet-4-6}"

  CLOUDFLARE_TUNNEL_TOKEN="$o_token"
  if [[ "$MODE" == "tunnel" ]]; then
    echo; echo "Cloudflare Zero Trust → Networks → Tunnels → Create tunnel → salin token"
    if [[ -n "$o_token" ]]; then ask_secret CLOUDFLARE_TUNNEL_TOKEN "CLOUDFLARE_TUNNEL_TOKEN" "keep:$o_token"
    else ask_secret CLOUDFLARE_TUNNEL_TOKEN "CLOUDFLARE_TUNNEL_TOKEN"; fi
  fi

  # ── rahasia internal: dibuat otomatis, DIPERTAHANKAN bila sudah ada ──────
  # (POSTGRES_PASSWORD & JWT_SECRET tidak boleh berubah setelah database dibuat)
  local o_pg o_jwt o_anon o_svc o_sync
  o_pg="$(env_get POSTGRES_PASSWORD)"; o_jwt="$(env_get JWT_SECRET)"
  o_anon="$(env_get NEXT_PUBLIC_SUPABASE_ANON_KEY)"; o_svc="$(env_get SUPABASE_SERVICE_ROLE_KEY)"
  o_sync="$(env_get SYNC_SECRET)"
  POSTGRES_PASSWORD="${o_pg:-$(openssl rand -hex 24)}"
  JWT_SECRET="${o_jwt:-$(openssl rand -hex 32)}"
  SYNC_SECRET="${o_sync:-$(openssl rand -hex 32)}"
  if [[ -n "$o_jwt" && "$o_anon" == eyJ* && "$o_svc" == eyJ* && "$(env_get NEXT_PUBLIC_SUPABASE_URL)" == */supabase-api ]]; then
    NEXT_PUBLIC_SUPABASE_ANON_KEY="$o_anon"; SUPABASE_SERVICE_ROLE_KEY="$o_svc"
  else
    local iat exp; iat="$(date +%s)"; exp=$((iat + 10 * 365 * 86400))
    NEXT_PUBLIC_SUPABASE_ANON_KEY="$(make_jwt anon "$iat" "$exp")"
    SUPABASE_SERVICE_ROLE_KEY="$(make_jwt service_role "$iat" "$exp")"
  fi
  NEXT_PUBLIC_SUPABASE_URL="$NEXT_PUBLIC_SITE_URL/supabase-api"

  local CADDY_SITE_ADDRESS=":80" CADDY_HTTP_BIND="127.0.0.1:8080" CADDY_HTTPS_BIND="127.0.0.1:8443"
  if [[ "$MODE" == "caddy" ]]; then CADDY_SITE_ADDRESS="$APP_DOMAIN"; CADDY_HTTP_BIND="0.0.0.0:80"; CADDY_HTTPS_BIND="0.0.0.0:443"; fi

  local smtp_block=""
  if [[ -n "$(env_get SMTP_HOST)" ]]; then
    smtp_block="$(grep -E '^SMTP_' .env || true)"
  fi

  umask 077
  cat > .env.new <<ENV
# Dibuat oleh scripts/install.sh — JANGAN commit / bagikan file ini. Simpan cadangannya.
# ── Aplikasi ──
APP_DOMAIN=$APP_DOMAIN
NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
# ── Database & auth lokal (otomatis; JANGAN diubah setelah database dibuat) ──
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
JWT_SECRET=$JWT_SECRET
NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY
# ── Penyimpanan file (Cloudinary) ──
CLOUDINARY_CLOUD_NAME=$CLOUDINARY_CLOUD_NAME
CLOUDINARY_API_KEY=$CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET=$CLOUDINARY_API_SECRET
# ── AI (opsional) ──
ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY
ANTHROPIC_MODEL=$ANTHROPIC_MODEL
# ── Sync Google Sheet (pasang nilai yang sama di Apps Script) ──
SYNC_SECRET=$SYNC_SECRET
# ── Jaringan ──
CLOUDFLARE_TUNNEL_TOKEN=$CLOUDFLARE_TUNNEL_TOKEN
CADDY_SITE_ADDRESS=$CADDY_SITE_ADDRESS
CADDY_HTTP_BIND=$CADDY_HTTP_BIND
CADDY_HTTPS_BIND=$CADDY_HTTPS_BIND
# ── Email (opsional, hanya untuk reset password/undangan; isi jika perlu) ──
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=
# SMTP_PASS=
# SMTP_ADMIN_EMAIL=
# SMTP_SENDER_NAME=Rustika Client
${smtp_block}
ENV
  [[ -f .env ]] && cp -p .env ".env.bak.$(date +%Y%m%d-%H%M%S)"
  mv .env.new .env
  chmod 600 .env
  ok ".env ditulis (chmod 600). Password DB, JWT secret, API key & SYNC_SECRET dibuat otomatis."
}

# ── 3) Jalankan stack ───────────────────────────────────────────────────────
bring_up() {
  [[ -n "${DRY_RUN:-}" ]] && { warn "DRY_RUN: lewati docker compose up"; return; }
  mkdir -p data/db backups
  log "Build & jalankan stack (mode: $MODE) — build pertama ±3-6 menit"
  # shellcheck disable=SC2046
  if ! $DC $(profile_args) up -d --build; then
    $DC logs --tail=60 db auth rest 2>/dev/null || true
    die "Stack gagal dijalankan — lihat log di atas (kirim tampilan ini jika perlu bantuan)"
  fi
}

wait_healthy() {
  [[ -n "${DRY_RUN:-}" ]] && return
  log "Menunggu layanan healthy"
  local c
  for c in rustika-db rustika-auth rustika-rest rustika-client; do
    if wait_container_healthy "$c" 240; then ok "$c healthy"
    else $DC logs --tail=60 "${c#rustika-}" 2>/dev/null || true; die "$c tidak healthy — lihat log di atas"; fi
  done
  log "Cek lewat gateway (lokal)"
  curl -fsS http://127.0.0.1:8000/api/status && echo
  curl -fsS http://127.0.0.1:8000/supabase-api/auth/v1/health && echo
  $DC ps
}

# ── 4) Isi database ─────────────────────────────────────────────────────────
setup_database() {
  [[ -n "${DRY_RUN:-}" || $SKIP_DB -eq 1 ]] && return
  local n
  n="$(dbsql "select count(*) from pg_tables where schemaname = 'public'")"
  if [[ "$n" != "0" ]]; then ok "Database sudah berisi ($n tabel) — setup skema dilewati"; return; fi
  log "Database lokal masih kosong"
  echo "  1) PINDAHKAN semua data dari Supabase cloud (proyek, dokumen, user & password) — disarankan"
  echo "  2) Mulai dari kosong (skema baru + 1 akun super admin)"
  local choice; read -r -p "Pilihan [1/2] (1): " choice || true; choice="${choice:-1}"
  if [[ "$choice" == "1" ]]; then
    bash "$ROOT/scripts/migrate-from-supabase.sh"
  else
    bash "$ROOT/scripts/db-migrate.sh"
    bash "$ROOT/scripts/create-admin.sh"
  fi
}

# ── 5) Langkah dashboard yang tersisa ───────────────────────────────────────
print_next_steps() {
  local site host; site="$(env_get NEXT_PUBLIC_SITE_URL)"; host="${site#https://}"
  cat <<TXT

════════════════════════════════════════════════════════════════════
 SELESAI DI SERVER. Database, login & API sekarang ada di server ini.
════════════════════════════════════════════════════════════════════
1) Cloudflare Zero Trust → Tunnels → tunnel-mu → Public Hostname:
     Subdomain: ${host%%.*}    Domain: ${host#*.}    Service: HTTP → gateway:80
   $([[ "$MODE" == caddy ]] && echo "Mode Caddy: DNS A record $host → IP publik server; port 80/443 terbuka." || echo "Mode Tunnel: tidak perlu buka port apa pun.")

2) Google Sheet → Extensions → Apps Script (docs/google-sheet-sync.gs):
     ENDPOINT_URL = "$site/api/sync/projects"
     SYNC_SECRET  = (lihat:  grep ^SYNC_SECRET .env )

3) Cek:  $site/api/status  → {"status":"ok"}   lalu login seperti biasa.
   Password user sama seperti sebelumnya (ikut dipindahkan).

Backup harian otomatis (disarankan, sekali saja):
   (crontab -l 2>/dev/null; echo "15 2 * * * cd $ROOT && bash scripts/db-backup.sh >> backups/backup.log 2>&1") | crontab -
Update versi berikutnya:  bash scripts/update.sh $MODE
Supabase cloud boleh dihapus SETELAH semua dicek beres.
════════════════════════════════════════════════════════════════════
TXT
}

ensure_docker
write_env
bring_up
wait_healthy
setup_database
print_next_steps
