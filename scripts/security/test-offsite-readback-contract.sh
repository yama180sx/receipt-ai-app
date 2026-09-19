#!/usr/bin/env bash
# 実R2、credential、systemd、backup保存先を操作せず、読み戻し検証の安全契約を検査する。
set -euo pipefail

project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
helper="${project_root}/ops/systemd/libexec/receipt-offsite-verify"

test -f "${helper}"
bash -n "${helper}"

for environment in dev stable; do
  unit="${project_root}/ops/systemd/units/receipt-offsite-verify-${environment}.service"
  test -f "${unit}"
  for expected in \
    "EnvironmentFile=/etc/receipt-ai-app/offsite-${environment}.env" \
    "RuntimeDirectory=receipt-ai-app-offsite-verify-${environment}" \
    "LoadCredentialEncrypted=r2_access_key_id:/etc/receipt-ai-app/credentials/${environment}/r2_access_key_id.cred" \
    "LoadCredentialEncrypted=r2_secret_access_key:/etc/receipt-ai-app/credentials/${environment}/r2_secret_access_key.cred" \
    "LoadCredentialEncrypted=rclone_crypt_password:/etc/receipt-ai-app/credentials/${environment}/rclone_crypt_password.cred" \
    "LoadCredentialEncrypted=rclone_crypt_salt:/etc/receipt-ai-app/credentials/${environment}/rclone_crypt_salt.cred" \
    "ExecStart=/usr/local/libexec/receipt-offsite-verify ${environment}"; do
    grep -Fqx "${expected}" "${unit}" || {
      echo "[ERROR] offsite readback unit is missing: ${expected}" >&2
      exit 1
    }
  done
done

require_text() {
  local expected="$1"
  grep -Fq "${expected}" "${helper}" || {
    echo "[ERROR] offsite readback helper is missing: ${expected}" >&2
    exit 1
  }
}

for expected in \
  "command -v rclone" \
  "command -v jq" \
  "r2_access_key_id r2_secret_access_key rclone_crypt_password rclone_crypt_salt" \
  "no_check_bucket = true" \
  "rclone --config \"\${config_file}\" lsf 'crypt:' --dirs-only" \
  'rclone --config "${config_file}" copy "crypt:${selected_timestamp}" "${staging_directory}"' \
  "backup manifest is invalid" \
  "downloaded backup artifact does not match its manifest" \
  "validate_uploads_archive \"\${staging_directory}/uploads.tar.gz\"" \
  "generation verified successfully"; do
  require_text "${expected}"
done

if grep -Eq 'rclone[[:space:]].*(sync|delete|purge|move)|rclone[[:space:]].*copy[[:space:]].*"\$\{staging_directory\}"[[:space:]].*crypt:' "${helper}"; then
  echo '[ERROR] readback helper must not modify remote generations.' >&2
  exit 1
fi

if grep -Ev '^[[:space:]]*#' "${helper}" | grep -Eq '(^|[^A-Za-z_])\.env([^A-Za-z_]|$)|access_key_id=.*[^\)]$|secret_access_key=.*[^\)]$'; then
  echo '[ERROR] readback helper must not contain plaintext credentials or dotenv fallback.' >&2
  exit 1
fi

echo '[OK] offsite readback contract is structurally valid.'
