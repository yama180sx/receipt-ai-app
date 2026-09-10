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

grep -Fq 'sudo -n /usr/bin/systemctl start receipt-deploy-stable.service' .github/workflows/deploy.yml

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

echo "[OK] root deployment contract is structurally valid."
