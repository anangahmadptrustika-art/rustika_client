#!/usr/bin/env bash
# Update ke versi terbaru & rebuild.  Pakai: bash scripts/update.sh [tunnel|caddy]
set -euo pipefail
cd "$(dirname "$0")/.."
MODE="${1:-tunnel}"
if docker compose version >/dev/null 2>&1; then DC="docker compose"; else DC="sudo docker compose"; fi
git pull --ff-only
$DC --profile "$MODE" up -d --build
$DC ps
curl -fsS http://127.0.0.1:3000/api/status && echo
