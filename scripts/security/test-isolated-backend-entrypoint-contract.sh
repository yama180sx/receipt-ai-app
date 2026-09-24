#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
entry="${root}/backend/src/isolatedRestoreServer.ts"
runtime="${root}/backend/src/isolatedRestoreServerRuntime.ts"
test -f "${entry}" && test -f "${runtime}"
grep -Fq "loadSecretFiles()" "${entry}"
grep -Fq "import('./isolatedRestoreServerRuntime.js')" "${entry}"
grep -Fq 'workerを一切importしない' "${entry}"
grep -Fq "createApp" "${runtime}"
if grep -Eq "workers/|recoverReceiptAnalysisJobs|enqueuePendingAiBudgetNotifications" "${entry}" "${runtime}"; then
  echo '[ERROR] isolated backend entrypoint must not start workers or recovery jobs.' >&2
  exit 1
fi
echo '[OK] isolated backend entrypoint contract is structurally valid.'
