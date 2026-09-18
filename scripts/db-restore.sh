#!/usr/bin/env bash
# Pulihkan database dari file backup (hasil scripts/db-backup.sh).
# Pakai: bash scripts/db-restore.sh backups/rustika-20260918-021500.dump
# PERINGATAN: isi database sekarang DIGANTI dengan isi backup.
set -euo pipefail
cd "$(dirname "$0")/.."
# shellcheck source=scripts/lib.sh
. scripts/lib.sh
detect_compose
FILE="${1:-}"; [[ -f "$FILE" ]] || die "pakai: bash scripts/db-restore.sh <file.dump>"
warn "Semua data saat ini akan DIGANTI dengan isi $FILE"
read -r -p "Ketik YA untuk lanjut: " c || true; [[ "$c" == "YA" ]] || die "dibatalkan"

PGR="$DC exec -T db pg_restore -U supabase_admin -h localhost -d postgres"

log "Hentikan app/auth/rest sementara"
$DC stop gateway app auth rest >/dev/null

log "1/3 Restore skema & data aplikasi (public)"
dbsql "drop schema if exists public cascade; create schema public; alter schema public owner to postgres;"
$PGR -n public < "$FILE" 2> backups/restore.log || \
  warn "pg_restore melaporkan peringatan (detail: backups/restore.log) — lanjut"
dbsql < supabase/self-host/post-restore.sql >/dev/null

log "2/3 Restore akun login (auth.users, auth.identities)"
dbsql "delete from auth.identities; delete from auth.sessions; delete from auth.users;"
$PGR --data-only -n auth -t users -t identities < "$FILE" 2>> backups/restore.log || \
  warn "pg_restore (auth) melaporkan peringatan — lihat backups/restore.log"

log "3/3 Jalankan kembali"
$DC start auth rest app gateway >/dev/null
ok "Restore selesai. Tabel: $(dbsql "select count(*) from pg_tables where schemaname='public'"), akun: $(dbsql 'select count(*) from auth.users')"
