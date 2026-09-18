#!/usr/bin/env bash
# MacBookのroot管理runtime用credentialを対話的に登録する。
# 値は標準出力、Git、シェル履歴、作業ツリーへ出力しない。
set -euo pipefail

readonly INSTANCE_NAME='mb-stable'
readonly CREDENTIAL_DIRECTORY="/etc/receipt-ai-app/credentials/${INSTANCE_NAME}"
readonly SCRIPT_DIRECTORY="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly REPOSITORY_ROOT="$(cd "${SCRIPT_DIRECTORY}/../.." && pwd)"
readonly ROOT_ENV_FILE="${REPOSITORY_ROOT}/.env"
readonly BACKEND_ENV_FILE="${REPOSITORY_ROOT}/backend/.env"

die() {
  echo "[macbook-credentials] $1" >&2
  exit 1
}

[ "$(id -u)" -eq 0 ] || die 'run this script with sudo; do not share the password'
[ -r "${ROOT_ENV_FILE}" ] || die 'MacBook root .env is unavailable'
[ -r "${BACKEND_ENV_FILE}" ] || die 'MacBook backend .env is unavailable'
command -v systemd-creds >/dev/null 2>&1 || die 'systemd-creds is unavailable'
command -v openssl >/dev/null 2>&1 || die 'openssl is unavailable'

read_env_value() {
  local file="$1"
  local name="$2"
  local value
  value="$(sed -n "s/^${name}=//p" "${file}" | tail -n 1)"
  # dotenvで許容される全体引用符はruntime credentialへ含めない。
  case "${value}" in
    \"*\") value="${value#\"}"; value="${value%\"}" ;;
    \'*\') value="${value#\'}"; value="${value%\'}" ;;
  esac
  [ -n "${value}" ] || die "required existing setting is unavailable: ${name}"
  printf '%s' "${value}"
}

prompt_secret() {
  local label="$1"
  local value
  printf '%s: ' "${label}" >&2
  IFS= read -r -s value
  printf '\n' >&2
  [ -n "${value}" ] || die "${label} must not be empty"
  printf '%s' "${value}"
}

write_credential() {
  local name="$1"
  local value="$2"
  [ -n "${value}" ] || die "credential input is empty: ${name}"
  # stdinで渡すため、値はargv・journal・shell履歴へ出ない。
  local temporary
  temporary="$(mktemp "${CREDENTIAL_DIRECTORY}/.${name}.XXXXXX")"
  if ! printf '%s' "${value}" | systemd-creds encrypt --name="${name}" - "${temporary}"; then
    rm -f -- "${temporary}"
    die "credential encryption failed: ${name}"
  fi
  install -m 0600 -o root -g root "${temporary}" "${CREDENTIAL_DIRECTORY}/${name}.cred"
  rm -f -- "${temporary}"
}

umask 077
install -d -o root -g root -m 0700 "${CREDENTIAL_DIRECTORY}"

# 現行MacBookだけの既存値を読む。T320のcredential・設定ファイルには触れない。
database_url="$(read_env_value "${BACKEND_ENV_FILE}" DATABASE_URL)"
jwt_secret="$(read_env_value "${BACKEND_ENV_FILE}" JWT_SECRET)"
db_password="$(read_env_value "${ROOT_ENV_FILE}" DB_PASSWORD)"

echo '[macbook-credentials] Enter MacBook-specific external credentials. Input is hidden.' >&2
gemini_api_key="$(prompt_secret 'Gemini API key')"
ai_budget_discord_webhook="$(prompt_secret 'AI budget Discord webhook URL')"
backup_discord_webhook="$(prompt_secret 'Backup Discord webhook URL')"
smtp_user="$(prompt_secret 'SMTP user')"
smtp_password="$(prompt_secret 'SMTP password')"
smtp_from="$(prompt_secret 'SMTP from address')"
totp_encryption_key="$(openssl rand -base64 48)"

write_credential backend_database_url "${database_url}"
write_credential backend_jwt_secret "${jwt_secret}"
write_credential backend_totp_encryption_key "${totp_encryption_key}"
write_credential backend_gemini_api_key "${gemini_api_key}"
write_credential backend_ai_budget_discord_webhook "${ai_budget_discord_webhook}"
write_credential backend_smtp_user "${smtp_user}"
write_credential backend_smtp_password "${smtp_password}"
write_credential backend_smtp_from "${smtp_from}"
write_credential postgres_password "${db_password}"
write_credential db_password "${db_password}"
write_credential backup_discord_webhook_url "${backup_discord_webhook}"

unset database_url jwt_secret db_password gemini_api_key ai_budget_discord_webhook \
  backup_discord_webhook smtp_user smtp_password smtp_from totp_encryption_key
echo '[macbook-credentials] encrypted credentials created for mb-stable; no values were printed.' >&2
