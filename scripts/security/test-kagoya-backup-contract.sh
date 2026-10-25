#!/usr/bin/env bash
# 実KAGOYA、credential、Docker、R2を操作せずKAGOYA backup経路を検査する。
set -euo pipefail

project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
helper="${project_root}/ops/systemd/libexec/receipt-backup-kagoya-validation"

test -f "${helper}"
bash -n "${helper}"

for file in \
  ops/systemd/units/receipt-backup-kagoya-validation.service \
  ops/systemd/units/receipt-backup-kagoya-validation.timer \
  ops/systemd/units/receipt-offsite-backup-kagoya-validation.service \
  ops/systemd/units/receipt-offsite-backup-kagoya-validation.timer \
  ops/systemd/units/receipt-offsite-verify-kagoya-validation.service \
  ops/systemd/config/offsite-kagoya-validation.env.example; do
  test -f "${project_root}/${file}"
done

for expected in \
  "readonly compose_env='/etc/receipt-ai-app/kagoya-validation/compose.env'" \
  "readonly backup_directory='/var/backups/receipt-ai-app/kagoya-validation'" \
  'postgres_password' \
  'docker exec -i "${database_container}" sh -c' \
  'find "${backup_directory}/db"' \
  'generation completed successfully'; do
  grep -Fq "${expected}" "${helper}" || {
    echo "[ERROR] KAGOYA backup helper is missing: ${expected}" >&2
    exit 1
  }
done

if grep -Ev '^[[:space:]]*#' "${helper}" | grep -Eq 'docker exec -e PGPASSWORD=|R2_|https?://'; then
  echo '[ERROR] KAGOYA backup helper must not expose credentials or contain R2 configuration.' >&2
  exit 1
fi

for expected in \
  'OnCalendar=*-*-* 03:00:00 Asia/Tokyo' \
  'Persistent=true' \
  'Unit=receipt-backup-kagoya-validation.service'; do
  grep -Fqx "${expected}" "${project_root}/ops/systemd/units/receipt-backup-kagoya-validation.timer"
done

grep -Fqx 'Unit=receipt-offsite-backup-kagoya-validation.service' \
  "${project_root}/ops/systemd/units/receipt-offsite-backup-kagoya-validation.timer"
grep -Fqx 'ExecStart=/usr/local/libexec/receipt-offsite-backup kagoya-validation' \
  "${project_root}/ops/systemd/units/receipt-offsite-backup-kagoya-validation.service"
grep -Fqx 'ExecStart=/usr/local/libexec/receipt-offsite-verify kagoya-validation' \
  "${project_root}/ops/systemd/units/receipt-offsite-verify-kagoya-validation.service"

echo '[OK] KAGOYA backup contract is structurally valid.'
