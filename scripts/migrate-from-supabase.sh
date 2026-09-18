#!/usr/bin/env bash
# ============================================================================
# PINDAHKAN semua data dari Supabase cloud → database lokal (container "db").
#
#   bash scripts/migrate-from-supabase.sh
#
# Yang dipindah: skema + data tabel aplikasi (schema "public"), serta user login
# (auth.users + auth.identities, termasuk hash password → password tetap sama).
# Cara kerja: pg_dump/psql versi 17 di dalam container db → menyambung ke
# Supabase lewat "Session pooler" (IPv4). Hasil dump disimpan di backups/migration/.
# Aman diulang: skema public lokal dibuat ulang dari awal setiap kali dijalankan.
# ============================================================================
set -euo pipefail
cd "$(dirname "$0")/.."
# shellcheck source=scripts/lib.sh
. scripts/lib.sh
detect_compose

OUT="backups/migration"; mkdir -p "$OUT"; chmod 700 backups "$OUT"

log "Migrasi data: Supabase cloud → database lokal"
cat <<'TXT'
Ambil connection string di dashboard Supabase:
  Project → tombol "Connect" (atas) → Method: Session pooler → salin URI
  → ganti [YOUR-PASSWORD] dengan password database (Project Settings → Database).
  Contoh: postgresql://postgres.abcdefghijkl:PASSWORD@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres
TXT
ask_secret SRC_URL "Connection string Supabase (tersembunyi)"
[[ "$SRC_URL" == postgres* ]] || die "harus diawali postgresql://"
if [[ "$SRC_URL" != *sslmode=* ]]; then
  if [[ "$SRC_URL" == *\?* ]]; then SRC_URL="$SRC_URL&sslmode=require"; else SRC_URL="$SRC_URL?sslmode=require"; fi
fi
export SRC_URL

# Jalankan psql/pg_dump di container db; URL sumber dikirim lewat ENV (bukan
# argumen perintah) supaya tidak muncul di daftar proses.
SRC_PASS="inherit"
src_run() {   # src_run '<perintah sh di dalam container; pakai "$SRC_URL">'
  if [[ "$SRC_PASS" == "inherit" ]]; then
    if [[ "$DC" == sudo* ]]; then
      SRC_URL="$SRC_URL" sudo --preserve-env=SRC_URL docker compose exec -T -e SRC_URL db sh -c "$1"
    else
      SRC_URL="$SRC_URL" docker compose exec -T -e SRC_URL db sh -c "$1"
    fi
  else
    $DC exec -T -e "SRC_URL=$SRC_URL" db sh -c "$1"
  fi
}
wait_container_healthy rustika-db 30 || die "container rustika-db belum jalan — jalankan dulu: bash scripts/install.sh"
# Beberapa versi compose tidak meneruskan variabel tanpa "=" → fallback.
if ! src_run 'test -n "$SRC_URL"' 2>/dev/null; then SRC_PASS="explicit"; fi

log "Tes koneksi ke Supabase"
if ! ver="$(src_run 'psql "$SRC_URL" -X -Atq -c "select version()"')"; then
  die "Tidak bisa menyambung. Pastikan URI Session pooler (port 5432) & password benar."
fi
ok "Terhubung: ${ver%%,*}"

log "Daftar tabel & jumlah baris di cloud"
src_run 'psql "$SRC_URL" -X -Atq -c "select tablename from pg_tables where schemaname='"'"'public'"'"' order by 1"' > "$OUT/tables.txt"
[[ -s "$OUT/tables.txt" ]] || die "Tidak ada tabel di schema public cloud — URL benar?"
: > "$OUT/cloud-counts.txt"
while read -r t; do
  c="$(src_run "psql \"\$SRC_URL\" -X -Atq -c 'select count(*) from public.\"$t\"'")"
  printf '%s\t%s\n' "$t" "$c" >> "$OUT/cloud-counts.txt"
done < "$OUT/tables.txt"
column -t "$OUT/cloud-counts.txt" 2>/dev/null || cat "$OUT/cloud-counts.txt"
users_cloud="$(src_run 'psql "$SRC_URL" -X -Atq -c "select count(*) from auth.users"')"
echo "auth.users (akun login): $users_cloud"

# ── database lokal: kosongkan public & auth users ─────────────────────────
n_local="$(dbsql "select count(*) from pg_tables where schemaname='public'")"
if [[ "$n_local" != "0" ]]; then
  warn "Database lokal sudah berisi $n_local tabel. Semua data LOKAL di schema public & user login akan DIHAPUS lalu diganti data cloud."
  read -r -p "Ketik YA untuk lanjut: " confirm || true
  [[ "$confirm" == "YA" ]] || die "dibatalkan"
fi
log "Menyiapkan database lokal (schema public dibuat ulang)"
dbsql <<'SQL'
drop schema if exists public cascade;
create schema public;
alter schema public owner to postgres;
grant usage on schema public to postgres, anon, authenticated, service_role;
delete from auth.identities;
delete from auth.sessions;
delete from auth.users;
SQL

# ── 1) skema public ────────────────────────────────────────────────────────
log "1/4 Salin skema tabel (public)"
src_run 'pg_dump "$SRC_URL" --schema-only --schema=public --no-publications --no-subscriptions --no-security-labels --no-tablespaces' \
  | grep -vE '^(CREATE SCHEMA public;|ALTER SCHEMA public OWNER TO|COMMENT ON SCHEMA public)' > "$OUT/public-schema.sql"
chmod 600 "$OUT"/*.sql
dbsql_lenient < "$OUT/public-schema.sql" > /dev/null 2> "$OUT/restore-schema.log" || true
errs="$(grep -c 'ERROR' "$OUT/restore-schema.log" || true)"
if [[ "$errs" != "0" ]]; then
  warn "$errs peringatan saat restore skema (biasanya objek yang sudah ada). Detail: $OUT/restore-schema.log"
  grep 'ERROR' "$OUT/restore-schema.log" | sort | uniq -c | sort -rn | head -10
fi
# Pastikan semua tabel cloud ada di lokal
missing=0
while read -r t; do
  [[ "$(dbsql "select count(*) from pg_tables where schemaname='public' and tablename='$t'")" == "1" ]] || { warn "tabel $t tidak terbentuk"; missing=1; }
done < "$OUT/tables.txt"
[[ $missing -eq 0 ]] || die "Ada tabel yang gagal dibuat — kirim isi $OUT/restore-schema.log"
ok "skema public siap"

# ── 2) user login (auth.users + auth.identities) ───────────────────────────
log "2/4 Salin akun login (password ikut, tidak berubah)"
copy_auth_table() {   # copy_auth_table <tabel>
  local t="$1" cols
  # kolom yang ADA di kedua sisi (tanpa kolom generated)
  cols="$(comm -12 \
    <(src_run "psql \"\$SRC_URL\" -X -Atq -c \"select column_name from information_schema.columns where table_schema='auth' and table_name='$t' and is_generated='NEVER'\"" | LC_ALL=C sort) \
    <(dbsql "select column_name from information_schema.columns where table_schema='auth' and table_name='$t' and is_generated='NEVER'" | LC_ALL=C sort) \
    | paste -sd, -)"
  [[ -n "$cols" ]] || die "tidak bisa menentukan kolom auth.$t"
  src_run "psql \"\$SRC_URL\" -X -q -c \"COPY (SELECT $cols FROM auth.$t) TO STDOUT CSV HEADER\"" > "$OUT/auth-$t.csv"
  chmod 600 "$OUT/auth-$t.csv"
  {
    echo "SET session_replication_role = replica;"
    echo "COPY auth.$t($cols) FROM STDIN CSV HEADER;"
    cat "$OUT/auth-$t.csv"
    printf '\\.\n'
  } | dbsql
  rm -f "$OUT/auth-$t.csv"
}
copy_auth_table users
copy_auth_table identities
ok "auth.users lokal: $(dbsql 'select count(*) from auth.users') (cloud: $users_cloud)"

# ── 3) data tabel aplikasi ─────────────────────────────────────────────────
log "3/4 Salin isi tabel (public)"
src_run 'pg_dump "$SRC_URL" --data-only --schema=public --no-publications --no-subscriptions' > "$OUT/public-data.sql"
chmod 600 "$OUT/public-data.sql"
{ echo "SET session_replication_role = replica;"; cat "$OUT/public-data.sql"; } | dbsql
ok "data tersalin"

# ── 4) rapikan: pemilik, hak akses, trigger, statistik ─────────────────────
log "4/4 Rapikan hak akses & trigger"
dbsql < supabase/self-host/post-restore.sql >/dev/null
ok "selesai"

# ── verifikasi jumlah baris ────────────────────────────────────────────────
log "Verifikasi jumlah baris (cloud vs lokal)"
bad=0
printf '%-28s %10s %10s\n' TABEL CLOUD LOKAL
while IFS=$'\t' read -r t c; do
  l="$(dbsql "select count(*) from public.\"$t\"")"
  if [[ "$l" == "$c" ]]; then printf '%-28s %10s %10s  ✔\n' "$t" "$c" "$l"
  else printf '%-28s %10s %10s  ✖ BEDA\n' "$t" "$c" "$l"; bad=1; fi
done < "$OUT/cloud-counts.txt"
[[ $bad -eq 0 ]] && ok "Semua tabel cocok" || warn "Ada tabel yang jumlahnya beda — kirim tampilan ini untuk dicek"

# ── file lama di Supabase Storage? ────────────────────────────────────────
legacy="$(dbsql "select coalesce((select count(*) from public.project_documents where coalesce(storage,'supabase') not in ('cloudinary','r2')),0) + coalesce((select count(*) from public.project_images where coalesce(storage,'supabase') not in ('cloudinary','r2')),0)" 2>/dev/null || echo 0)"
if [[ "$legacy" != "0" ]]; then
  warn "$legacy file dokumen/foto lama masih tersimpan di Supabase Storage (bukan Cloudinary)."
  echo "   Pindahkan ke Cloudinary SEBELUM project Supabase dihapus:  bash scripts/migrate-legacy-files.sh"
else
  ok "Tidak ada file di Supabase Storage — semua file sudah di Cloudinary"
fi
unset SRC_URL
echo
ok "Migrasi database selesai. Dump tersimpan di $OUT/ (chmod 600)."
