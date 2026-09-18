#!/usr/bin/env bash
# Helper bersama untuk scripts/*.sh (di-source, bukan dijalankan langsung).
# shellcheck shell=bash

log()  { printf '\n\033[1;36m▶ %s\033[0m\n' "$*"; }
ok()   { printf '\033[1;32m✔ %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m! %s\033[0m\n' "$*"; }
die()  { printf '\033[1;31m✖ %s\033[0m\n' "$*" >&2; exit 1; }

# ── prompt (nilai rahasia tidak pernah di-echo / dicatat) ───────────────────
ask() {            # ask VAR "Label" "default"
  local var="$1" label="$2" def="${3:-}" val
  if [[ -n "$def" ]]; then read -r -p "$label [$def]: " val || true; val="${val:-$def}"
  else while :; do read -r -p "$label: " val || true; [[ -n "$val" ]] && break; warn "wajib diisi"; done; fi
  printf -v "$var" '%s' "$val"
}
ask_secret() {     # ask_secret VAR "Label" [optional|keep:<nilai lama>]
  local var="$1" label="$2" mode="${3:-}" val
  while :; do
    if [[ "$mode" == keep:* ]]; then read -r -s -p "$label [Enter = pakai yang ada]: " val || true
    else read -r -s -p "$label: " val || true; fi
    echo
    if [[ -z "$val" && "$mode" == keep:* ]]; then val="${mode#keep:}"; fi
    [[ -n "$val" || "$mode" == "optional" ]] && break
    warn "wajib diisi"
  done
  printf -v "$var" '%s' "$val"
}

# ── Docker Compose ──────────────────────────────────────────────────────────
DC=""
detect_compose() {
  if [[ -n "${DRY_RUN:-}" ]]; then DC="docker compose"; return; fi
  if docker compose version >/dev/null 2>&1; then DC="docker compose"
  elif sudo docker compose version >/dev/null 2>&1; then DC="sudo docker compose"
  else die "Docker Compose v2 tidak tersedia. Jalankan: bash scripts/install.sh"; fi
}

# ── Database lokal (container "db") ─────────────────────────────────────────
# psql sebagai superuser supabase_admin. Pakai:  dbsql "select 1"   atau   dbsql < file.sql
dbsql() {
  if [[ $# -gt 0 ]]; then
    $DC exec -T db psql -U supabase_admin -h localhost -d postgres -v ON_ERROR_STOP=1 -X -Atq -c "$1"
  else
    $DC exec -T db psql -U supabase_admin -h localhost -d postgres -v ON_ERROR_STOP=1 -X -q
  fi
}
# Sama, tapi error tidak menghentikan (untuk restore skema yang toleran).
dbsql_lenient() {
  $DC exec -T db psql -U supabase_admin -h localhost -d postgres -v ON_ERROR_STOP=0 -X -q
}

wait_container_healthy() {   # wait_container_healthy <container> <max-detik>
  local name="$1" max="${2:-120}" st i
  for ((i = 0; i < max; i += 5)); do
    st="$(docker inspect -f '{{.State.Health.Status}}' "$name" 2>/dev/null || sudo docker inspect -f '{{.State.Health.Status}}' "$name" 2>/dev/null || echo starting)"
    [[ "$st" == "healthy" ]] && return 0
    [[ "$st" == "unhealthy" ]] && return 1
    sleep 5
  done
  return 1
}

# Baca satu nilai dari .env (tanpa mengeksekusi file).
env_get() { grep -E "^$1=" .env 2>/dev/null | head -1 | cut -d= -f2- || true; }
