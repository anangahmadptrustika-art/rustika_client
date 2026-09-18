#!/usr/bin/env bash
# ============================================================================
# Rustika Client — installer "sekali jalan" untuk server sendiri (Ubuntu/Debian)
#
#   git clone https://github.com/anangahmadptrustika-art/rustika_client.git
#   cd rustika_client
#   bash scripts/install.sh              # mode Cloudflare Tunnel (default, di balik NAT)
#   bash scripts/install.sh --caddy      # mode Caddy (IP publik, port 80/443 terbuka)
#   bash scripts/install.sh --reconfigure# isi ulang .env
#
# Yang dilakukan: pasang Docker (jika belum) → tanya rahasia SEKALI (input
# tersembunyi) → generate SYNC_SECRET → tulis .env (chmod 600) → build & jalankan
# stack → tunggu healthy → cek /api/status → cetak langkah dashboard yang tersisa.
# Aman dijalankan ulang (.env yang ada tidak ditimpa kecuali --reconfigure).
# ============================================================================
set -euo pipefail

MODE="tunnel"; RECONF=0
for a in "$@"; do
  case "$a" in
    --tunnel) MODE="tunnel" ;;
    --caddy) MODE="caddy" ;;
    --reconfigure) RECONF=1 ;;
    -h|--help) sed -n '2,15p' "$0"; exit 0 ;;
    *) echo "Opsi tidak dikenal: $a (lihat --help)"; exit 1 ;;
  esac
done

cd "$(dirname "$0")/.."
ROOT="$(pwd)"
DOMAIN_DEFAULT="client.rustika.co.id"

log()  { printf '\n\033[1;36m▶ %s\033[0m\n' "$*"; }
ok()   { printf '\033[1;32m✔ %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m! %s\033[0m\n' "$*"; }
die()  { printf '\033[1;31m✖ %s\033[0m\n' "$*" >&2; exit 1; }

# ── prompt helpers (nilai rahasia tidak pernah di-echo) ─────────────────────
ask() {            # ask VAR "Label" "default"
  local var="$1" label="$2" def="${3:-}" val
  if [[ -n "$def" ]]; then read -r -p "$label [$def]: " val || true; val="${val:-$def}"
  else while :; do read -r -p "$label: " val || true; [[ -n "$val" ]] && break; warn "wajib diisi"; done; fi
  printf -v "$var" '%s' "$val"
}
ask_secret() {     # ask_secret VAR "Label" [optional]
  local var="$1" label="$2" opt="${3:-}" val
  while :; do
    read -r -s -p "$label: " val || true; echo
    [[ -n "$val" || -n "$opt" ]] && break
    warn "wajib diisi"
  done
  printf -v "$var" '%s' "$val"
}

# ── 1) Docker ───────────────────────────────────────────────────────────────
DC=""
ensure_docker() {
  log "Cek Docker"
  if ! command -v docker >/dev/null 2>&1; then
    [[ -n "${DRY_RUN:-}" ]] && { warn "DRY_RUN: lewati instalasi Docker"; return; }
    log "Memasang Docker (script resmi get.docker.com)"
    curl -fsSL https://get.docker.com -o /tmp/get-docker.sh
    sudo sh /tmp/get-docker.sh
    rm -f /tmp/get-docker.sh
    sudo usermod -aG docker "$USER" || true
  fi
  if [[ -n "${DRY_RUN:-}" ]]; then DC="docker compose"; return; fi
  if docker compose version >/dev/null 2>&1; then DC="docker compose"
  elif sudo docker compose version >/dev/null 2>&1; then DC="sudo docker compose"; warn "docker butuh sudo di sesi ini (login ulang agar grup 'docker' aktif)"
  else die "Docker Compose v2 tidak tersedia. Pasang Docker lalu jalankan lagi."; fi
  ok "Docker siap ($DC)"
}

# ── 2) .env ─────────────────────────────────────────────────────────────────
write_env() {
  if [[ -f .env && $RECONF -eq 0 ]]; then ok ".env sudah ada — dipakai (gunakan --reconfigure untuk isi ulang)"; return; fi
  log "Konfigurasi .env (rahasia diketik tersembunyi; tidak ditampilkan & tidak dicatat)"
  command -v openssl >/dev/null || die "openssl tidak ada: sudo apt-get install -y openssl"

  ask APP_DOMAIN "Domain aplikasi" "$DOMAIN_DEFAULT"
  ask NEXT_PUBLIC_SITE_URL "Site URL" "https://$APP_DOMAIN"

  echo; echo "Supabase → Project Settings → API"
  while :; do ask NEXT_PUBLIC_SUPABASE_URL "NEXT_PUBLIC_SUPABASE_URL (https://xxxx.supabase.co)"; [[ "$NEXT_PUBLIC_SUPABASE_URL" =~ ^https://[a-z0-9-]+\.supabase\.co/?$ ]] && break; warn "format harus https://<ref>.supabase.co"; done
  ask_secret NEXT_PUBLIC_SUPABASE_ANON_KEY "NEXT_PUBLIC_SUPABASE_ANON_KEY (anon public)"
  ask_secret SUPABASE_SERVICE_ROLE_KEY "SUPABASE_SERVICE_ROLE_KEY (service_role — rahasia server)"

  echo; echo "Cloudinary → Dashboard → Product Environment"
  ask CLOUDINARY_CLOUD_NAME "CLOUDINARY_CLOUD_NAME"
  ask CLOUDINARY_API_KEY "CLOUDINARY_API_KEY"
  ask_secret CLOUDINARY_API_SECRET "CLOUDINARY_API_SECRET"

  echo; echo "Anthropic (opsional — kosongkan jika AI Assistant tidak dipakai)"
  ask_secret ANTHROPIC_API_KEY "ANTHROPIC_API_KEY" optional
  ask ANTHROPIC_MODEL "ANTHROPIC_MODEL" "claude-sonnet-4-6"

  CLOUDFLARE_TUNNEL_TOKEN=""
  if [[ "$MODE" == "tunnel" ]]; then
    echo; echo "Cloudflare Zero Trust → Networks → Tunnels → Create tunnel → salin token"
    ask_secret CLOUDFLARE_TUNNEL_TOKEN "CLOUDFLARE_TUNNEL_TOKEN"
  fi

  SYNC_SECRET="$(openssl rand -hex 32)"

  umask 077
  cat > .env <<ENV
# Dibuat oleh scripts/install.sh — JANGAN commit file ini.
APP_DOMAIN=$APP_DOMAIN
NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY
CLOUDINARY_CLOUD_NAME=$CLOUDINARY_CLOUD_NAME
CLOUDINARY_API_KEY=$CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET=$CLOUDINARY_API_SECRET
ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY
ANTHROPIC_MODEL=$ANTHROPIC_MODEL
SYNC_SECRET=$SYNC_SECRET
CLOUDFLARE_TUNNEL_TOKEN=$CLOUDFLARE_TUNNEL_TOKEN
ENV
  chmod 600 .env
  ok ".env ditulis (chmod 600). SYNC_SECRET baru dibuat otomatis."
}

# ── 3) Jalankan stack ───────────────────────────────────────────────────────
bring_up() {
  [[ -n "${DRY_RUN:-}" ]] && { warn "DRY_RUN: lewati docker compose up"; return; }
  log "Build & jalankan (profile: $MODE) — build pertama ±3-6 menit"
  $DC --profile "$MODE" up -d --build
}

wait_healthy() {
  [[ -n "${DRY_RUN:-}" ]] && return
  log "Menunggu aplikasi healthy"
  local i st
  for i in $(seq 1 48); do
    st="$(docker inspect -f '{{.State.Health.Status}}' rustika-client 2>/dev/null || sudo docker inspect -f '{{.State.Health.Status}}' rustika-client 2>/dev/null || echo starting)"
    [[ "$st" == "healthy" ]] && { ok "app healthy"; break; }
    [[ "$st" == "unhealthy" ]] && { $DC logs --tail=60 app; die "app unhealthy — lihat log di atas"; }
    sleep 5
  done
  [[ "$st" == "healthy" ]] || { $DC logs --tail=60 app; die "timeout menunggu healthy — lihat log di atas"; }
  log "Cek /api/status (lokal)"
  curl -fsS http://127.0.0.1:3000/api/status && echo
  $DC ps
}

# ── 4) Langkah dashboard yang tersisa (hanya bisa dari akunmu) ──────────────
print_next_steps() {
  # shellcheck disable=SC1091
  set -a; . ./.env; set +a
  local host="${NEXT_PUBLIC_SITE_URL#https://}"
  cat <<TXT

════════════════════════════════════════════════════════════════════
 SELESAI DI SERVER. Tinggal 3 langkah di dashboard (sekali saja):
════════════════════════════════════════════════════════════════════
1) Cloudflare Zero Trust → Tunnels → tunnel-mu → Public Hostname:
     Subdomain: ${host%%.*}    Domain: ${host#*.}    Service: HTTP → app:3000
   ($([[ "$MODE" == caddy ]] && echo "Mode Caddy: buat DNS A record $host → IP publik server, buka port 80/443." || echo "Mode Tunnel: tidak perlu buka port apa pun."))

2) Supabase → Authentication → URL Configuration:
     Site URL      : $NEXT_PUBLIC_SITE_URL
     Redirect URLs : $NEXT_PUBLIC_SITE_URL/**

3) Google Sheet → Extensions → Apps Script (docs/google-sheet-sync.gs):
     ENDPOINT_URL = "$NEXT_PUBLIC_SITE_URL/api/sync/projects"
     SYNC_SECRET  = (lihat:  grep ^SYNC_SECRET .env )

Lalu buka $NEXT_PUBLIC_SITE_URL/api/status → harus JSON {"status":"ok"}.
Update versi berikutnya:  bash scripts/update.sh $MODE
════════════════════════════════════════════════════════════════════
TXT
}

ensure_docker
write_env
bring_up
wait_healthy
print_next_steps
