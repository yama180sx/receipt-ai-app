#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
helper="$root/ops/systemd/libexec/receipt-offsite-restore-isolated-login-acceptance"
runtime="$root/ops/systemd/libexec/receipt-offsite-restore-isolated-login-acceptance-runtime"
bash -n "$helper" "$runtime"
need_runtime() { grep -Fq "$1" "$runtime" || { echo "[ERROR] missing runtime contract: $1" >&2; exit 1; }; }
for text in "APP_ROOT='/srv/receipt-ai-app'" 'ALTER ROLE cntadm PASSWORD' 'src/isolatedRestoreServer.ts' 'requiresTotpVerification' 'verify-totp' 'no host port is published'; do need_runtime "$text"; done
for forbidden in backend_gemini_api_key backend_ai_budget_discord_webhook backend_smtp_user backend_smtp_password backend_smtp_from 'docker compose' '/var/lib/receipt-ai-app/${env}' /mnt/raid_1t/backups; do
  if grep -Fq "$forbidden" "$runtime"; then echo "[ERROR] forbidden: $forbidden" >&2; exit 1; fi
done
grep -Fq 'systemd-run --quiet --wait --pty --collect' "$helper"
grep -Fq 'LoadCredentialEncrypted=backend_jwt_secret:/etc/receipt-ai-app/credentials/${environment}/backend_jwt_secret.cred' "$helper"
grep -Fq 'LoadCredentialEncrypted=backend_totp_encryption_key:/etc/receipt-ai-app/credentials/${environment}/backend_totp_encryption_key.cred' "$helper"
grep -Fq 'read -r -s -p' "$runtime"
grep -Fq '[ -t 0 ] grep -Fq '[ -t 0 ] && [ -t 1 ]' ""grep -Fq '[ -t 0 ] && [ -t 1 ]' "" [ -t 1 ]' "$helper"
grep -Fq 'test-isolated-backend-entrypoint-contract.sh' "$runtime"
grep -Fq 'export DOCKER_CONFIG="$runtime/docker-config"' "$runtime"
grep -Fq 'if .HostPort' "$runtime"
echo '[OK] isolated login acceptance contract is structurally valid.'
