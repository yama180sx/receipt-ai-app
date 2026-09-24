#!/usr/bin/env bash
# 実systemd・credential・R2を操作せず、起動時offsite送信と失敗通知の安全契約を検査する。
set -euo pipefail

project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
notification_helper="${project_root}/ops/systemd/libexec/receipt-offsite-backup-failure"

test -f "${notification_helper}"
bash -n "${notification_helper}"

for environment in dev stable; do
  backup_unit="${project_root}/ops/systemd/units/receipt-offsite-backup-${environment}.service"
  timer_unit="${project_root}/ops/systemd/units/receipt-offsite-backup-${environment}.timer"
  failure_unit="${project_root}/ops/systemd/units/receipt-offsite-backup-failure-${environment}.service"

  test -f "${backup_unit}"
  test -f "${timer_unit}"
  test -f "${failure_unit}"

  grep -Fqx "OnFailure=receipt-offsite-backup-failure-${environment}.service" "${backup_unit}"
  grep -Fqx 'OnBootSec=10min' "${timer_unit}"
  grep -Fqx "Unit=receipt-offsite-backup-${environment}.service" "${timer_unit}"
  grep -Fqx 'WantedBy=timers.target' "${timer_unit}"
  if grep -Eq '^(OnCalendar|Persistent)=' "${timer_unit}"; then
    echo "[ERROR] offsite timer must run only after boot: ${environment}" >&2
    exit 1
  fi

  for expected in \
    "RuntimeDirectory=receipt-ai-app-offsite-backup-failure-${environment}" \
    "LoadCredentialEncrypted=backup_discord_webhook_url:/etc/receipt-ai-app/credentials/${environment}/backup_discord_webhook_url.cred" \
    "ExecStart=/usr/local/libexec/receipt-offsite-backup-failure ${environment}" \
    "ReadWritePaths=/run/receipt-ai-app-offsite-backup-failure-${environment}"; do
    grep -Fqx "${expected}" "${failure_unit}" || {
      echo "[ERROR] offsite failure unit is missing: ${expected}" >&2
      exit 1
    }
  done
done

for expected in \
  "curl --config - --fail --silent --show-error" \
  'R2オフサイトバックアップが失敗しました。秘密値を表示せず、T320のroot管理journalを確認してください。' \
  'notification credential is unavailable'; do
  grep -Fq "${expected}" "${notification_helper}" || {
    echo "[ERROR] offsite failure helper is missing: ${expected}" >&2
    exit 1
  }
done

if grep -Ev '^[[:space:]]*#' "${notification_helper}" | grep -Eq 'https?://|backup_discord_webhook_url=.*[^)]$'; then
  echo '[ERROR] offsite failure helper must not contain a plaintext notification target.' >&2
  exit 1
fi

echo '[OK] offsite schedule contract is structurally valid.'
