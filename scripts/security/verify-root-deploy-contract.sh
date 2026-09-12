#!/bin/bash
# 実Secret、systemd、Dockerを操作せず、Issue #131-3-2の静的契約だけを確認する。
set -euo pipefail

project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${project_root}"

if grep -En '\$\{\{[[:space:]]*secrets\.' .github/workflows/deploy.yml; then
  echo "[ERROR] deploy workflow must not reference GitHub Secrets." >&2
  exit 1
fi

if grep -En 'docker compose|rsync|npm install|prisma migrate' .github/workflows/deploy.yml; then
  echo "[ERROR] deploy workflow must not operate Docker or runtime files directly." >&2
  exit 1
fi

grep -Fq 'workflow_dispatch:' .github/workflows/deploy.yml
grep -Fq 'environment: stable' .github/workflows/deploy.yml
grep -Fq 'sudo -n /usr/bin/systemctl start receipt-deploy-stable.service' .github/workflows/deploy.yml
if grep -Eq '^  push:' .github/workflows/deploy.yml; then
  echo "[ERROR] stable deployment must not start from a push event." >&2
  exit 1
fi

for file in \
  ops/systemd/libexec/receipt-deploy \
  ops/systemd/libexec/receipt-backup \
  ops/systemd/units/receipt-deploy-dev.service \
  ops/systemd/units/receipt-deploy-stable.service \
  ops/systemd/units/receipt-backup-dev.service \
  ops/systemd/units/receipt-backup-stable.service; do
  test -f "${file}" || {
    echo "[ERROR] missing managed runtime artifact: ${file}" >&2
    exit 1
  }
done

for helper in ops/systemd/libexec/receipt-deploy ops/systemd/libexec/receipt-backup; do
  bash -n "${helper}"
done

require_exact_line() {
  local expected_line="$1"
  local file="$2"
  if ! grep -Fqx "${expected_line}" "${file}"; then
    echo "[ERROR] missing runtime directory contract: ${file}" >&2
    exit 1
  fi
}

require_exact_line 'RuntimeDirectory=receipt-ai-app-dev' \
  ops/systemd/units/receipt-deploy-dev.service
require_exact_line 'RuntimeDirectory=receipt-ai-app-stable' \
  ops/systemd/units/receipt-deploy-stable.service
require_exact_line 'RuntimeDirectory=receipt-ai-app-backup-dev' \
  ops/systemd/units/receipt-backup-dev.service
require_exact_line 'RuntimeDirectory=receipt-ai-app-backup-stable' \
  ops/systemd/units/receipt-backup-stable.service

for compose_file in docker-compose.yml docker-compose.secrets.yml docker-compose.runtime.yml; do
  if ! grep -Fq -- "-f \"\${APP_DIRECTORY}/${compose_file}\"" ops/systemd/libexec/receipt-deploy; then
    echo "[ERROR] root deploy helper must use an absolute Compose path: ${compose_file}" >&2
    exit 1
  fi
done

if ! grep -Fq 'DOCKER_CONFIG="${DOCKER_CONFIG_DIRECTORY}"' ops/systemd/libexec/receipt-deploy; then
  echo "[ERROR] root deploy helper must keep Docker CLI state out of the protected home directory." >&2
  exit 1
fi

if ! grep -Fq 'export DOCKER_CONFIG="${DOCKER_CONFIG_DIRECTORY}"' ops/systemd/libexec/receipt-backup; then
  echo "[ERROR] root backup helper must keep Docker CLI state out of the protected home directory." >&2
  exit 1
fi

for expected_line in \
  'RECAIPT_BACKUP_UPLOADS_DIR="${DATA_DIRECTORY}/uploads"' \
  'RUNTIME_UPLOADS_DIR="${RECAIPT_BACKUP_UPLOADS_DIR:-}"'; do
  if ! grep -Fq "${expected_line}" ops/systemd/libexec/receipt-backup scripts/backup.sh; then
    echo "[ERROR] root backup must use managed uploads and fail on incomplete backups." >&2
    exit 1
  fi
done

if ! tail -n 5 scripts/backup.sh | grep -Fqx '    exit 1'; then
  echo "[ERROR] root backup must return a failure status after an incomplete backup." >&2
  exit 1
fi

if ! grep -Fq 'chown 999:root "${directory}"' ops/systemd/libexec/receipt-deploy; then
  echo "[ERROR] root deploy helper must preserve container ownership of runtime data directories." >&2
  exit 1
fi

if ! grep -Fq 'install -T -m 0444 -o root -g root "${source}" "${destination}/${name}"' ops/systemd/libexec/receipt-deploy; then
  echo "[ERROR] root deploy helper must stage credentials as files, not directory contents." >&2
  exit 1
fi

for unit in ops/systemd/units/receipt-deploy-dev.service ops/systemd/units/receipt-deploy-stable.service; do
  require_exact_line 'RuntimeDirectoryPreserve=yes' "${unit}"
  if [ "$(grep -Fc '[Install]' "${unit}")" -ne 1 ]; then
    echo "[ERROR] root deploy unit must contain exactly one [Install] section: ${unit}" >&2
    exit 1
  fi
done

for expected_line in \
  'EXPO_PUBLIC_APP_ENV: ${ENV_NAME}' \
  'EXPO_PUBLIC_API_URL: http://${HOST_IP}:${BACKEND_PORT}/api'; do
  if ! grep -Fq "${expected_line}" docker-compose.runtime.yml; then
    echo "[ERROR] runtime frontend must receive its required public configuration." >&2
    exit 1
  fi
done

if grep -Fq 'EXPO_PUBLIC_API_TOKEN' docker-compose.runtime.yml; then
  echo "[ERROR] runtime frontend must not receive an API token." >&2
  exit 1
fi

for expected_line in \
  'RECAIPT_BACKEND_ENV_FILE=%s/backend/.env' \
  '${RECAIPT_BACKEND_ENV_FILE:?RECAIPT_BACKEND_ENV_FILE is required}'; do
  if ! grep -Fq "${expected_line}" ops/systemd/libexec/receipt-deploy docker-compose.runtime.yml; then
    echo "[ERROR] runtime backend must receive its generated non-secret configuration." >&2
    exit 1
  fi
done

for expected_line in \
  'run_compose up -d --wait --force-recreate db redis' \
  'run_compose up -d --no-deps --force-recreate --remove-orphans backend frontend frontend-dev' \
  'readonly SECRET_DIRECTORY="$(mktemp -d -p "${SECRET_ROOT}" generation.XXXXXX)"' \
  'if (!statSync(databaseUrlFile).isFile()) process.exit(21);' \
  'fetch("http://127.0.0.1:3000/health")' \
  'cleanup_retired_runtime_secrets'; do
  if ! grep -Fq "${expected_line}" ops/systemd/libexec/receipt-deploy; then
    echo "[ERROR] root deploy helper is missing the runtime lifecycle contract." >&2
    exit 1
  fi
done

for expected_line in \
  'STABLE_RELEASE_SHA=<approved-40-character-lowercase-commit-sha>' \
  '[[ "${STABLE_RELEASE_SHA}" =~ ^[0-9a-f]{40}$ ]] || die "stable release commit must be a lowercase full SHA"' \
  'if [ "${ENVIRONMENT}" = "stable" ] && [ "${CHECKED_OUT_SHA}" != "${GIT_REF}" ]; then' \
  'echo "[receipt-deploy] stable release commit: ${CHECKED_OUT_SHA}"'; do
  if ! grep -Fq "${expected_line}" ops/systemd/config/stable.env.example ops/systemd/libexec/receipt-deploy; then
    echo "[ERROR] stable deployment must use a root-managed approved commit." >&2
    exit 1
  fi
done

config_load_line=$(grep -nF 'load_non_secret_config "${CONFIG_FILE}"' \
  ops/systemd/libexec/receipt-deploy | head -n 1 | cut -d: -f1)
stable_sha_check_line=$(grep -nF 'stable release commit is unavailable' \
  ops/systemd/libexec/receipt-deploy | head -n 1 | cut -d: -f1)
if [ -z "${config_load_line}" ] || [ -z "${stable_sha_check_line}" ] || \
  [ "${config_load_line}" -ge "${stable_sha_check_line}" ]; then
  echo "[ERROR] stable release SHA must be loaded from root config before validation." >&2
  exit 1
fi

echo "[OK] root deployment contract is structurally valid."
