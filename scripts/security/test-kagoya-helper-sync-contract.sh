#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
helper="${root}/ops/systemd/libexec/receipt-deploy-kagoya-validation"
unit="${root}/ops/systemd/units/receipt-deploy-kagoya-validation.service"
config="${root}/ops/systemd/config/kagoya-validation-deploy.env.example"
fail() { echo "[ERROR] $1" >&2; exit 1; }

for file in "${helper}" "${unit}" "${config}"; do [ -f "${file}" ] || fail 'required KAGOYA helper-sync file is missing'; done
bash -n "${helper}"
for expected in \
  "readonly repository_url='https://github.com/yama180sx/receipt-ai-app.git'" \
  "readonly source_helper='scripts/vps/receipt-emergency-password-reset-kagoya'" \
  "readonly installed_helper='/usr/local/libexec/receipt-emergency-password-reset-kagoya'" \
  "KAGOYA_RELEASE_SHA" \
  'git -C "${app_directory}" checkout --detach --force "${release_sha}"' \
  'install -T -o root -g root -m 0750' \
  'cmp -s "${source_path}" "${installed_helper}"'; do
  grep -Fq "${expected}" "${helper}" || fail "missing helper boundary: ${expected}"
done
grep -Fqx 'ExecStart=/usr/local/libexec/receipt-deploy-kagoya-validation' "${unit}"
grep -Fqx 'ProtectSystem=strict' "${unit}"
grep -Fqx 'NoNewPrivileges=yes' "${unit}"
grep -Fqx 'KAGOYA_RELEASE_SHA=<approved-full-commit-sha>' "${config}"
if grep -Ev '^[[:space:]]*#' "${helper}" | grep -Eq 'docker compose|\$@|eval |/home/'; then fail 'helper must not accept arbitrary execution inputs'; fi
echo '[OK] KAGOYA helper synchronization contract is valid.'
