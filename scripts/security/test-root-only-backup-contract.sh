#!/usr/bin/env bash
# 実環境・credential・Docker・backup保存先を操作せず、backup.shのroot管理契約を検査する。
set -euo pipefail

project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
backup_script="${project_root}/scripts/backup.sh"

bash -n "${backup_script}"

temporary_output="$(mktemp)"
trap 'rm -f -- "${temporary_output}"' EXIT

if env -u RECAIPT_BACKUP_SECRET_DIR -u RECAIPT_BACKUP_UPLOADS_DIR \
  "${backup_script}" dev >"${temporary_output}" 2>&1; then
  echo "[ERROR] backup must reject missing root-managed inputs." >&2
  exit 1
fi
grep -Fqx '[ERROR] Root-managed backup secret directory is unavailable.' \
  <(sed -E 's/^\[[^]]+\] //' "${temporary_output}")

for forbidden in \
  'DOTENV_FILE=' \
  'backend/uploads' \
  "grep '^DB_PASSWORD='" \
  "grep '^BACKUP_DISCORD_WEBHOOK_URL='" \
  'BACKUP_DISCORD_WEBHOOK_URL:-'; do
  if grep -Fq "${forbidden}" "${backup_script}"; then
    echo "[ERROR] backup must not retain legacy fallback: ${forbidden}" >&2
    exit 1
  fi
done

for expected in \
  'SECRET_DIR="${RECAIPT_BACKUP_SECRET_DIR:-}"' \
  'RUNTIME_UPLOADS_DIR="${RECAIPT_BACKUP_UPLOADS_DIR:-}"' \
  'DB_SECRET_FILE="${SECRET_DIR}/db_password"' \
  'WEBHOOK_SECRET_FILE="${SECRET_DIR}/backup_discord_webhook_url"'; do
  if ! grep -Fq "${expected}" "${backup_script}"; then
    echo "[ERROR] backup is missing root-managed input: ${expected}" >&2
    exit 1
  fi
done

echo "[OK] backup accepts root-managed inputs only."
