#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
helper="$root/ops/systemd/libexec/receipt-offsite-restore-isolated-login-acceptance"
bash -n "$helper"
need() { grep -Fq "$1" "$helper" || { echo "[ERROR] missing: $1" >&2; exit 1; }; }
for text in \
  "APP_ROOT='/srv/receipt-ai-app'" \
  'isolated-login-acceptance' \
  'backend_jwt_secret' \
  'backend_totp_encryption_key' \
  'ALTER ROLE cntadm PASSWORD' \
  'docker run -d --name "$valkey" --network "$net" --network-alias redis' \
  'src/isolatedRestoreServer.ts' \
  'requiresTotpVerification' \
  'verify-totp' \
  'no host port is published'; do need "$text"; done
for forbidden in \
  'backend_gemini_api_key' \
  'backend_ai_budget_discord_webhook' \
  'backend_smtp_user' \
  'backend_smtp_password' \
  'backend_smtp_from' \
  'docker compose' \
  '/var/lib/receipt-ai-app/${env}' \
  '/mnt/raid_1t/backups'; do
  if grep -Fq "$forbidden" "$helper"; then echo "[ERROR] forbidden: $forbidden" >&2; exit 1; fi
done
for env in dev stable; do
  unit="$root/ops/systemd/units/receipt-offsite-restore-isolated-login-acceptance-${env}@.service"
  test -f "$unit"
  grep -Fqx "RuntimeDirectory=receipt-ai-app-isolated-login-acceptance-${env}" "$unit"
  grep -Fqx "LoadCredentialEncrypted=backend_jwt_secret:/etc/receipt-ai-app/credentials/${env}/backend_jwt_secret.cred" "$unit"
  grep -Fqx "LoadCredentialEncrypted=backend_totp_encryption_key:/etc/receipt-ai-app/credentials/${env}/backend_totp_encryption_key.cred" "$unit"
  grep -Fqx "ExecStart=/usr/local/libexec/receipt-offsite-restore-isolated-login-acceptance ${env} accept %i --confirm isolated-login-acceptance" "$unit"
done
echo '[OK] isolated login acceptance contract is structurally valid.'
