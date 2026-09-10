#!/bin/bash
# 実Secret、systemd、Dockerを操作せず、Issue #131-3-2の静的契約だけを確認する。
set -euo pipefail

project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${project_root}"

if rg -n '\$\{\{\s*secrets\.' .github/workflows/deploy.yml; then
  echo "[ERROR] deploy workflow must not reference GitHub Secrets." >&2
  exit 1
fi

if rg -n 'docker compose|rsync|npm install|prisma migrate' .github/workflows/deploy.yml; then
  echo "[ERROR] deploy workflow must not operate Docker or runtime files directly." >&2
  exit 1
fi

rg -q 'sudo -n /usr/bin/systemctl start receipt-deploy-stable.service' .github/workflows/deploy.yml

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

echo "[OK] root deployment contract is structurally valid."
