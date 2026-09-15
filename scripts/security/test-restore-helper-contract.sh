#!/usr/bin/env bash
# 実環境・バックアップ・credentialを操作せず、root管理restore helperの安全契約を検査する。
set -euo pipefail

project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
helper="${project_root}/ops/systemd/libexec/receipt-restore"

test -f "${helper}"
bash -n "${helper}"

require_text() {
  local expected="$1"
  if ! grep -Fq "${expected}" "${helper}"; then
    echo "[ERROR] restore helper is missing: ${expected}" >&2
    exit 1
  fi
}

for expected in \
  '[ "$#" -eq 4 ] || die' \
  '[[ "${TARGET_TIMESTAMP}" =~ ^[0-9]{8}_[0-9]{6}$ ]]' \
  'restore-root-managed-backup' \
  'systemctl start "${BACKUP_UNIT}"' \
  'gzip -t "${DATABASE_BACKUP}"' \
  'uploads backup has an unexpected archive layout' \
  'uploads backup contains a non-regular entry' \
  'systemd-creds decrypt --name=db_password' \
  'docker stop "receipt-${ENVIRONMENT}-backend"' \
  'ON_ERROR_STOP=1' \
  'valkey-cli FLUSHALL' \
  'systemctl start "${DEPLOY_UNIT}"' \
  'previous uploads are retained for explicit rollback'; do
  require_text "${expected}"
done

if grep -Ev '^[[:space:]]*#' "${helper}" | grep -Eq '(^|[^A-Za-z_])\.env([^A-Za-z_]|$)|docker compose|PGPASSWORD='; then
  echo "[ERROR] restore helper must not use plaintext .env, direct Compose, or secret process arguments." >&2
  exit 1
fi

echo "[OK] root restore helper contract is structurally valid."
