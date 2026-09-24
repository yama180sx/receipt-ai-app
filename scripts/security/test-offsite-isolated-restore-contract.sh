#!/usr/bin/env bash
# 実R2・Docker・credentialを操作せず、隔離復旧helperの安全境界を検査する。
set -euo pipefail

project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
helper="${project_root}/ops/systemd/libexec/receipt-offsite-restore-isolated"
test -f "${helper}"
bash -n "${helper}"

require_text() {
  grep -Fq "$1" "${helper}" || { echo "[ERROR] isolated restore helper is missing: $1" >&2; exit 1; }
}
for expected in \
  "ISOLATED_DATA_ROOT='/var/lib/receipt-ai-app-isolated-restore'" \
  'isolate-r2-backup' \
  'destroy-isolated-r2-restore' \
  "rclone --config \"\${config_file}\" lsf 'crypt:' --dirs-only" \
  'rclone --config "${config_file}" copy "crypt:${selected_timestamp}" "${staging_directory}"' \
  'downloaded backup artifact does not match its manifest' \
  'validate_uploads_archive "${staging_directory}/uploads.tar.gz"' \
  'docker network create --internal "${isolated_network}"' \
  'POSTGRES_PASSWORD_FILE=/run/secrets/postgres_password' \
  'docker run -d --name "${database_container}" --network "${isolated_network}"' \
  'no host port is published' \
  'rm -rf -- "${target_directory}"'; do
  require_text "${expected}"
done
for forbidden in \
  '/var/lib/receipt-ai-app/${environment}' \
  '/mnt/raid_1t/backups' \
  'rclone --config "${config_file}" sync' \
  'rclone --config "${config_file}" delete' \
  'rclone --config "${config_file}" purge' \
  'docker compose' \
  'TOTP_ENCRYPTION_KEY' \
  'JWT_SECRET'; do
  if grep -Fq "${forbidden}" "${helper}"; then
    echo "[ERROR] isolated restore helper must not include: ${forbidden}" >&2
    exit 1
  fi
done
for environment in dev stable; do
  unit="${project_root}/ops/systemd/units/receipt-offsite-restore-isolated-${environment}.service"
  test -f "${unit}"
  for expected in \
    "EnvironmentFile=/etc/receipt-ai-app/offsite-${environment}.env" \
    "RuntimeDirectory=receipt-ai-app-offsite-restore-isolated-${environment}" \
    "ExecStart=/usr/local/libexec/receipt-offsite-restore-isolated ${environment} restore --confirm isolate-r2-backup" \
    'ProtectSystem=strict' \
    'ProtectHome=yes'; do
    grep -Fqx "${expected}" "${unit}" || { echo "[ERROR] isolated restore unit is missing: ${expected}" >&2; exit 1; }
  done
done
echo '[OK] isolated R2 restore contract is structurally valid.'
