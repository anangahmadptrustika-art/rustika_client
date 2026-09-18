#!/usr/bin/env bash
# Buat akun SUPER ADMIN pertama (lewat API auth lokal + tabel profiles).
# Pakai: bash scripts/create-admin.sh
set -euo pipefail
cd "$(dirname "$0")/.."
# shellcheck source=scripts/lib.sh
. scripts/lib.sh
detect_compose

SERVICE_KEY="$(env_get SUPABASE_SERVICE_ROLE_KEY)"
[[ -n "$SERVICE_KEY" ]] || die "SUPABASE_SERVICE_ROLE_KEY tidak ada di .env — jalankan scripts/install.sh dulu"

log "Buat akun super admin"
ask ADMIN_EMAIL "Email admin"
ask ADMIN_NAME "Nama lengkap" "Administrator"
while :; do
  ask_secret ADMIN_PASS "Password (min. 6 karakter)"
  [[ ${#ADMIN_PASS} -ge 6 ]] && break
  warn "password terlalu pendek"
done

json_escape() { local s="$1"; s="${s//\\/\\\\}"; s="${s//\"/\\\"}"; printf '%s' "$s"; }
BODY="$(printf '{"email":"%s","password":"%s","email_confirm":true,"user_metadata":{"full_name":"%s","role":"super_admin"}}' \
  "$(json_escape "$ADMIN_EMAIL")" "$(json_escape "$ADMIN_PASS")" "$(json_escape "$ADMIN_NAME")")"

# Lewat gateway internal (127.0.0.1:8000 → auth). Header apikey/Bearer = service_role.
RESP="$(curl -sS -o /tmp/rustika-admin.json -w '%{http_code}' \
  -X POST http://127.0.0.1:8000/supabase-api/auth/v1/admin/users \
  -H "apikey: $SERVICE_KEY" -H "Authorization: Bearer $SERVICE_KEY" \
  -H "Content-Type: application/json" --data "$BODY")" || die "gagal menghubungi API auth lokal"
unset ADMIN_PASS BODY
if [[ "$RESP" != "200" && "$RESP" != "201" ]]; then
  cat /tmp/rustika-admin.json; echo; rm -f /tmp/rustika-admin.json
  die "API auth menjawab HTTP $RESP (email sudah terdaftar?)"
fi
rm -f /tmp/rustika-admin.json

# Pastikan role di profiles = super_admin (trigger membuatnya dari user_metadata).
dbsql "update public.profiles set role = 'super_admin', full_name = coalesce(nullif(full_name,''), split_part(email,'@',1)), is_active = true where email = '$(printf '%s' "$ADMIN_EMAIL" | sed "s/'/''/g")'" >/dev/null
ok "Akun $ADMIN_EMAIL dibuat sebagai super_admin. Silakan login di aplikasi."
