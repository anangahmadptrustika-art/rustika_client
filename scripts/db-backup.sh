#!/usr/bin/env bash
# Backup database (schema public + auth) ke backups/rustika-<tanggal>.dump
# Pakai: bash scripts/db-backup.sh        (simpan 14 terakhir; ubah dengan KEEP=30)
# Jadwalkan harian:  crontab -e  →  15 2 * * * cd /path/rustika_client && bash scripts/db-backup.sh >> backups/backup.log 2>&1
set -euo pipefail
cd "$(dirname "$0")/.."
# shellcheck source=scripts/lib.sh
. scripts/lib.sh
detect_compose
KEEP="${KEEP:-14}"
mkdir -p backups; chmod 700 backups
f="backups/rustika-$(date +%Y%m%d-%H%M%S).dump"
umask 077
trap 'rm -f "$f.tmp"' EXIT
$DC exec -T db pg_dump -U supabase_admin -h localhost -d postgres -Fc -n public -n auth > "$f.tmp"
mv "$f.tmp" "$f"
sz="$(du -h "$f" | cut -f1)"
echo "$(date '+%F %T') backup OK: $f ($sz)"
# hapus yang lama
ls -1t backups/rustika-*.dump 2>/dev/null | tail -n +$((KEEP + 1)) | xargs -r rm -f
