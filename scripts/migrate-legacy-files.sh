#!/usr/bin/env bash
# Pindahkan file lama (yang masih di Supabase Storage) ke Cloudinary.
# Jalankan SEBELUM project Supabase cloud dihapus.
#   bash scripts/migrate-legacy-files.sh            # pindahkan
#   DRY_RUN=1 bash scripts/migrate-legacy-files.sh  # hanya lihat daftar
set -euo pipefail
cd "$(dirname "$0")/.."
# shellcheck source=scripts/lib.sh
. scripts/lib.sh
detect_compose

log "Pindahkan file lama: Supabase Storage → Cloudinary"
echo "Supabase → Project Settings → API"
while :; do
  ask CLOUD_SUPABASE_URL "Project URL Supabase lama (https://xxxx.supabase.co)"
  [[ "$CLOUD_SUPABASE_URL" =~ ^https://[a-z0-9-]+\.supabase\.co/?$ ]] && break
  warn "format harus https://<ref>.supabase.co"
done
ask_secret CLOUD_SERVICE_KEY "service_role key Supabase lama (tersembunyi)"
export CLOUD_SUPABASE_URL CLOUD_SERVICE_KEY DRY_RUN="${DRY_RUN:-}"

# Jalankan di dalam image app (Node 22) dengan env app + 2 variabel di atas.
# Nilai rahasia diteruskan lewat ENV, bukan argumen.
VOL="$(pwd)/scripts/migrate-legacy-files.mjs:/migrate.mjs:ro"
if [[ "$DC" == sudo* ]]; then
  sudo --preserve-env=CLOUD_SUPABASE_URL,CLOUD_SERVICE_KEY,DRY_RUN docker compose run --rm -T --no-deps \
    -v "$VOL" -e CLOUD_SUPABASE_URL -e CLOUD_SERVICE_KEY -e DRY_RUN app node /migrate.mjs
else
  docker compose run --rm -T --no-deps \
    -v "$VOL" -e CLOUD_SUPABASE_URL -e CLOUD_SERVICE_KEY -e DRY_RUN app node /migrate.mjs
fi
unset CLOUD_SERVICE_KEY
