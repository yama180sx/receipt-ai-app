#!/usr/bin/env bash
# 実R2、credential、systemd、backup保存先を操作せず、オフサイトbackupの安全契約を検査する。
set -euo pipefail

project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
helper="${project_root}/ops/systemd/libexec/receipt-offsite-backup"

test -f "${helper}"
bash -n "${helper}"

for environment in dev stable; do
  unit="${project_root}/ops/systemd/units/receipt-offsite-backup-${environment}.service"
  test -f "${unit}"
  for expected in \
    "EnvironmentFile=/etc/receipt-ai-app/offsite-${environment}.env" \
    "RuntimeDirectory=receipt-ai-app-offsite-backup-${environment}" \
    "LoadCredentialEncrypted=r2_access_key_id:/etc/receipt-ai-app/credentials/${environment}/r2_access_key_id.cred" \
    "LoadCredentialEncrypted=r2_secret_access_key:/etc/receipt-ai-app/credentials/${environment}/r2_secret_access_key.cred" \
    "LoadCredentialEncrypted=rclone_crypt_password:/etc/receipt-ai-app/credentials/${environment}/rclone_crypt_password.cred" \
    "LoadCredentialEncrypted=rclone_crypt_salt:/etc/receipt-ai-app/credentials/${environment}/rclone_crypt_salt.cred"; do
    grep -Fqx "${expected}" "${unit}" || {
      echo "[ERROR] offsite unit is missing: ${expected}" >&2
      exit 1
    }
  done
done

require_text() {
  local expected="$1"
  grep -Fq "${expected}" "${helper}" || {
    echo "[ERROR] offsite helper is missing: ${expected}" >&2
    exit 1
  }
}

for expected in \
  'systemctl start "${backup_unit}"' \
  'pre-offsite local backup did not succeed' \
  'rclone is unavailable' \
  'r2_access_key_id r2_secret_access_key rclone_crypt_password rclone_crypt_salt' \
  'manifestは最後に送信する完了印' \
  'rclone --config "${config_file}" check' \
  'rclone --config "${config_file}" copy "${staging_directory}/manifest.json"'; do
  require_text "${expected}"
done

if grep -Eq 'rclone[[:space:]].*sync|rclone[[:space:]].*delete|R2_S3_ENDPOINT=.*https?://[^<]' "${helper}"; then
  echo '[ERROR] offsite helper must not sync/delete remote generations or hardcode an endpoint.' >&2
  exit 1
fi

if grep -Ev '^[[:space:]]*#' "${helper}" | grep -Eq '(^|[^A-Za-z_])\.env([^A-Za-z_]|$)|access_key_id=.*[^\)]$|secret_access_key=.*[^\)]$'; then
  echo '[ERROR] offsite helper must not contain plaintext credentials or dotenv fallback.' >&2
  exit 1
fi

echo '[OK] offsite backup contract is structurally valid.'
