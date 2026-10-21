#!/usr/bin/env bash
# Issue #132-6: 実credential・VPS・Composeを操作せずhelperの安全境界だけを検証する。
set -Eeuo pipefail

project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
helper="${project_root}/scripts/vps/replace-gemini-api-key"

fail() {
  echo "[ERROR] $1" >&2
  exit 1
}

[ -f "${helper}" ] || fail 'KAGOYA Gemini credential helper is missing.'
bash -n "${helper}"

for required in \
  "readonly COMPOSE_ENV_FILE='/etc/receipt-ai-app/kagoya-validation/compose.env'" \
  "readonly CREDENTIAL_NAME='backend_gemini_api_key'" \
  "[ \"\${EUID}\" -eq 0 ]" \
  "[ \"\$#\" -eq 0 ]" \
  "read -r -s -p 'New Gemini API key: ' new_value" \
  "read -r -s -p 'Confirm new Gemini API key: ' confirmation_value" \
  'mktemp "${RECAIPT_SECRETS_DIR}/.${CREDENTIAL_NAME}.tmp.XXXXXX"' \
  "chown root:root \"\${temporary_file}\"" \
  "chmod 0600 \"\${temporary_file}\"" \
  "mv -f -- \"\${temporary_file}\" \"\${target_file}\"" \
  'credential file replaced without exposing its value'; do
  grep -Fq "${required}" "${helper}" || fail "missing required helper contract: ${required}"
done

for forbidden in \
  'echo "${new_value}"' \
  'echo "${confirmation_value}"' \
  'docker compose' \
  'systemctl' \
  'curl '; do
  if grep -Fq "${forbidden}" "${helper}"; then
    fail "helper must not contain: ${forbidden}"
  fi
done

echo '[OK] KAGOYA Gemini credential replacement helper contract is valid.'
