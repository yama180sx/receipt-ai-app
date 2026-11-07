#!/usr/bin/env bash
set -euo pipefail

project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
helper="${project_root}/scripts/vps/receipt-emergency-password-reset-kagoya"
runtime="${project_root}/backend/prisma/emergency-password-reset.ts"
fail() { echo "[ERROR] $1" >&2; exit 1; }

[ -f "${helper}" ] || fail 'KAGOYA emergency password reset helper is missing.'
[ -f "${runtime}" ] || fail 'Prisma 7 emergency password reset runtime is missing.'
bash -n "${helper}"
for required in \
  "readonly backend_container='receipt-kagoya-validation-backend-1'" \
  "readonly backup_unit='receipt-backup-kagoya-validation.service'" \
  '[ -t 0 ] && [ -t 1 ] || die' \
  'systemctl start "${backup_unit}"' \
  "read -r -s -p 'New password: ' new_password" \
  'npm exec tsx prisma/emergency-password-reset.ts' \
  'without exposing password values'; do
  grep -Fq "${required}" "${helper}" || fail "missing required helper contract: ${required}"
done
for required in 'bcrypt.hash(password, 12)' 'const authVersion = member.authVersion + 1' 'emergencyPasswordResetAudit.create' 'createPrismaClient'; do
  grep -Fq "${required}" "${runtime}" || fail "missing required Prisma runtime contract: ${required}"
done
if grep -Fq 'docker exec -e ' "${helper}"; then fail 'helper must not pass a password via environment variables.'; fi
if grep -Eq 'totpSecret:|totpEnabled:|totpKeyVersion:|totpVerifiedAt:' "${helper}"; then
  fail 'helper must not modify TOTP state.'
fi
echo '[OK] KAGOYA emergency password reset helper contract is valid.'
