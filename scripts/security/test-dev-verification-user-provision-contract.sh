#!/usr/bin/env bash
# 実環境・credential・Dockerを操作せず、Issue #159の静的契約を確認する。
set -euo pipefail

project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
helper="${project_root}/ops/systemd/libexec/receipt-provision-dev-verification-user"
runtime="${project_root}/backend/prisma/provision-dev-verification-user.ts"
service="${project_root}/backend/src/services/devVerificationUserProvision.ts"

fail() { echo "[ERROR] $1" >&2; exit 1; }

for file in "${helper}" "${runtime}" "${service}"; do
  [ -f "${file}" ] || fail "required artifact is missing: ${file}"
done
bash -n "${helper}"

for required in \
  '[ "$1" = dev ] || die' \
  '[ -t 0 ] && [ -t 1 ] || die' \
  'systemctl start "${backup_unit}"' \
  'read -r -s -p' \
  'npm exec tsx prisma/provision-dev-verification-user.ts' \
  'completed without exposing credential values'; do
  grep -Fq "${required}" "${helper}" || fail "missing helper contract: ${required}"
done

if grep -Fq 'docker exec -e ' "${helper}"; then
  fail 'helper must not pass credentials by environment variables.'
fi
if grep -Eq 'echo.*\$\{?(invite_code|password)' "${helper}"; then
  fail 'helper must not print credential values.'
fi

readonly sudoers_entry='  /usr/local/libexec/receipt-provision-dev-verification-user dev, \'
grep -Fqx "${sudoers_entry}" \
  "${project_root}/ops/systemd/sudoers.d/receipt-deploy" || fail 'sudoers must allow only the fixed dev helper invocation.'
grep -Fq "devVerificationFamilyName = 'dev検証世帯'" "${service}" || fail 'dedicated family name is missing.'
grep -Fq "devVerificationMemberName = 'dev検証ユーザー'" "${service}" || fail 'dedicated member name is missing.'
grep -Fq 'ALREADY_EXISTS' "${service}" || fail 'idempotent existing-user handling is missing.'

echo '[OK] dev verification-user provision contract is valid.'
