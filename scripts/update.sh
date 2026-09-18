#!/usr/bin/env bash
# Update ke versi terbaru & rebuild.  Pakai: bash scripts/update.sh [tunnel|caddy]
set -euo pipefail
cd "$(dirname "$0")/.."
# shellcheck source=scripts/lib.sh
. scripts/lib.sh
detect_compose
MODE="${1:-tunnel}"
PROFILE=""; [[ "$MODE" == "tunnel" ]] && PROFILE="--profile tunnel"
git checkout -q main && git pull --ff-only origin main
# shellcheck disable=SC2086
$DC $PROFILE up -d --build
$DC ps
curl -fsS http://127.0.0.1:8000/api/status && echo
