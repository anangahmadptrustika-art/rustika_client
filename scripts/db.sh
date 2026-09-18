#!/usr/bin/env bash
# Shell SQL ke database lokal (psql sebagai superuser).  Pakai: bash scripts/db.sh
#   bash scripts/db.sh -c "select count(*) from projects"
set -euo pipefail
cd "$(dirname "$0")/.."
# shellcheck source=scripts/lib.sh
. scripts/lib.sh
detect_compose
exec $DC exec db psql -U supabase_admin -h localhost -d postgres "$@"
