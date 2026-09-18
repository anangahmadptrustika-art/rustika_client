#!/usr/bin/env bash
# Buat skema database dari NOL (supabase/migrations/*.sql berurutan) lalu
# post-restore.sql (pemilik objek, hak akses role API, trigger profil).
# Pakai: bash scripts/db-migrate.sh     (aman diulang: migrasi bersifat idempoten)
set -euo pipefail
cd "$(dirname "$0")/.."
# shellcheck source=scripts/lib.sh
. scripts/lib.sh
detect_compose

log "Membuat skema database lokal (supabase/migrations/*.sql)"
for f in supabase/migrations/*.sql; do
  # 0003 = bucket & policy Supabase Storage (tidak dipakai lagi; file di Cloudinary)
  [[ "$(basename "$f")" == 0003_storage.sql ]] && continue
  printf '  • %s ... ' "$(basename "$f")"
  dbsql < "$f" >/dev/null
  echo ok
done
printf '  • self-host/post-restore.sql ... '
dbsql < supabase/self-host/post-restore.sql >/dev/null
echo ok
ok "Skema siap ($(dbsql "select count(*) from pg_tables where schemaname='public'") tabel)"
