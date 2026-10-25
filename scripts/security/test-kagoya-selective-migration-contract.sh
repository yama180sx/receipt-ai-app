#!/usr/bin/env bash
set -euo pipefail

project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
helper="${project_root}/backend/prisma/kagoya-selective-migration.ts"

test -f "${helper}"
grep -Fq "const CONFIRM_EXPORT = 'EXPORT_STABLE_AUTH_SETTINGS';" "${helper}"
grep -Fq "const CONFIRM_IMPORT = 'IMPORT_KAGOYA_AUTH_SETTINGS';" "${helper}"
grep -Fq "flag: 'wx'" "${helper}"
grep -Fq "totpEnabled: false" "${helper}"
grep -Fq "KAGOYA target must be empty before selective migration." "${helper}"

# Receipt-derived and operational data must not be selected for export.
if grep -Eq 'prisma\.(receipt|item|receiptAnalysisJob|apiUsageLog|productClassification)[A-Za-z]*\.findMany' "${helper}"; then
  echo '[ERROR] selective migration must not export receipt-derived or AI operational data.' >&2
  exit 1
fi

echo '[OK] KAGOYA selective migration contract is structurally valid.'
