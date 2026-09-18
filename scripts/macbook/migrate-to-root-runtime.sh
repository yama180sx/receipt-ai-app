#!/usr/bin/env bash
# Issue #128: MacBookの既存Composeをroot管理mb-stableへ一度だけ移す。
# T320のパス・credential・unitは対象外。
set -euo pipefail

readonly INSTANCE_NAME='mb-stable'
readonly SCRIPT_DIRECTORY="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly REPOSITORY_ROOT="$(cd "${SCRIPT_DIRECTORY}/../.." && pwd)"
readonly CONFIG_ROOT='/etc/receipt-ai-app'
readonly CONFIG_FILE="${CONFIG_ROOT}/${INSTANCE_NAME}.env"
readonly APP_DIRECTORY="/srv/receipt-ai-app/${INSTANCE_NAME}"
readonly DATA_DIRECTORY="/var/lib/receipt-ai-app/${INSTANCE_NAME}"
readonly BACKUP_DIRECTORY='/mnt/receipt-backups/receipt-app'
readonly SOURCE_ENV_FILE="${REPOSITORY_ROOT}/.env"
readonly SOURCE_BACKEND_ENV_FILE="${REPOSITORY_ROOT}/backend/.env"

die() { echo "[macbook-root-migration] $1" >&2; exit 1; }
[ "$(id -u)" -eq 0 ] || die 'run with sudo; do not share the password'
command -v rsync >/dev/null 2>&1 || die 'rsync is required'
command -v systemctl >/dev/null 2>&1 || die 'systemctl is required'
[ -r "${SOURCE_ENV_FILE}" ] || die 'source .env is unavailable'
[ -r "${SOURCE_BACKEND_ENV_FILE}" ] || die 'source backend/.env is unavailable'
[ -d "${REPOSITORY_ROOT}/pgdata" ] || die 'source Postgres data is unavailable'
[ -d "${REPOSITORY_ROOT}/backend/uploads" ] || die 'source uploads are unavailable'
[ -d "${REPOSITORY_ROOT}/valkeydata" ] || die 'source Valkey data is unavailable'
[ -d "${BACKUP_DIRECTORY}" ] || die 'MacBook backup directory is unavailable'

for credential in backend_database_url backend_jwt_secret backend_totp_encryption_key \
  backend_gemini_api_key backend_ai_budget_discord_webhook backend_smtp_user \
  backend_smtp_password backend_smtp_from postgres_password db_password \
  backup_discord_webhook_url; do
  [ -r "${CONFIG_ROOT}/credentials/${INSTANCE_NAME}/${credential}.cred" ] || die "credential is unavailable: ${credential}"
done

read_env_value() {
  local file="$1" name="$2" value
  value="$(sed -n "s/^${name}=//p" "${file}" | tail -n 1)"
  [ -n "${value}" ] || die "required setting is unavailable: ${name}"
  printf '%s' "${value}"
}

readonly HOST_IP="$(read_env_value "${SOURCE_ENV_FILE}" HOST_IP)"
readonly WEB_PORT="$(read_env_value "${SOURCE_ENV_FILE}" WEB_PORT)"
readonly BACKEND_PORT="$(read_env_value "${SOURCE_ENV_FILE}" BACKEND_PORT)"
readonly DEV_PORT="$(read_env_value "${SOURCE_ENV_FILE}" DEV_PORT)"
readonly DB_PORT="$(read_env_value "${SOURCE_ENV_FILE}" DB_PORT)"
readonly REDIS_PORT="$(read_env_value "${SOURCE_ENV_FILE}" REDIS_PORT)"
readonly EXPO_PORT_1="$(read_env_value "${SOURCE_ENV_FILE}" EXPO_PORT_1)"
readonly EXPO_PORT_2="$(read_env_value "${SOURCE_ENV_FILE}" EXPO_PORT_2)"
readonly RELEASE_SHA="$(git -C "${REPOSITORY_ROOT}" rev-parse --verify HEAD^{commit})"
readonly GEMINI_MODEL="$(read_env_value "${SOURCE_BACKEND_ENV_FILE}" GEMINI_MODEL)"

# 途中失敗時に、元のComposeを再起動する。コピー済みroot dataは残して調査対象とする。
source_stopped=0
root_deployed=0
restore_source_on_failure() {
  if [ "${source_stopped}" = 1 ] && [ "${root_deployed}" = 0 ]; then
    echo '[macbook-root-migration] root deployment failed; restarting prior Compose.' >&2
    (cd "${REPOSITORY_ROOT}" && docker compose up -d --no-build) || true
  fi
}
trap restore_source_on_failure EXIT

# root管理領域に既存データがある場合は、意図しない上書きを避けて停止する。
for path in "${DATA_DIRECTORY}/pgdata" "${DATA_DIRECTORY}/uploads" "${DATA_DIRECTORY}/valkeydata"; do
  [ ! -e "${path}" ] || die "root target already exists: ${path}"
done

install -d -o root -g root -m 0750 "${CONFIG_ROOT}" "${APP_DIRECTORY}" "${DATA_DIRECTORY}"
install -d -o root -g root -m 0700 "${CONFIG_ROOT}/credentials/${INSTANCE_NAME}"
umask 077
printf '%s\n' \
  "STABLE_RELEASE_SHA=${RELEASE_SHA}" \
  "INSTANCE_NAME=${INSTANCE_NAME}" \
  "HOST_IP=${HOST_IP}" "WEB_PORT=${WEB_PORT}" "BACKEND_PORT=${BACKEND_PORT}" \
  "DEV_PORT=${DEV_PORT}" "DB_PORT=${DB_PORT}" "REDIS_PORT=${REDIS_PORT}" \
  "EXPO_PORT_1=${EXPO_PORT_1}" "EXPO_PORT_2=${EXPO_PORT_2}" \
  'REDIS_PORT_INTERNAL=6379' 'SMTP_HOST=smtp.gmail.com' 'SMTP_PORT=587' 'SMTP_SECURE=false' \
  "GEMINI_RECEIPT_MODEL=${GEMINI_MODEL}" "GEMINI_PRODUCT_CLASSIFICATION_MODEL=${GEMINI_MODEL}" \
  'RECEIPT_MANUAL_RETRY_LIMIT=1' 'RECEIPT_MANUAL_RETRY_FAILURE_CODES=gemini_daily_quota' \
  'RECEIPT_ANALYSIS_MAINTENANCE_MODE=false' 'LOG_LEVEL=info' 'TRUST_PROXY_HOPS=0' > "${CONFIG_FILE}"
chmod 0600 "${CONFIG_FILE}"

install -D -o root -g root -m 0750 "${REPOSITORY_ROOT}/ops/systemd/libexec/receipt-deploy" /usr/local/libexec/receipt-deploy
install -D -o root -g root -m 0644 "${REPOSITORY_ROOT}/ops/systemd/units/receipt-deploy-mb-stable.service" /etc/systemd/system/receipt-deploy-mb-stable.service
systemctl daemon-reload

echo '[macbook-root-migration] stopping prior mb-stable Compose and copying persistent data.' >&2
(cd "${REPOSITORY_ROOT}" && docker compose down)
source_stopped=1
install -d -m 0700 "${DATA_DIRECTORY}/pgdata" "${DATA_DIRECTORY}/valkeydata"
install -d -m 0750 "${DATA_DIRECTORY}/uploads"
rsync -aHAX --numeric-ids "${REPOSITORY_ROOT}/pgdata/" "${DATA_DIRECTORY}/pgdata/"
rsync -aHAX --numeric-ids "${REPOSITORY_ROOT}/valkeydata/" "${DATA_DIRECTORY}/valkeydata/"
rsync -aHAX --numeric-ids "${REPOSITORY_ROOT}/backend/uploads/" "${DATA_DIRECTORY}/uploads/"
chown -R 999:root "${DATA_DIRECTORY}/pgdata" "${DATA_DIRECTORY}/valkeydata"
chmod 0700 "${DATA_DIRECTORY}/pgdata" "${DATA_DIRECTORY}/valkeydata"
chown -R 1000:1000 "${DATA_DIRECTORY}/uploads"

systemctl start receipt-deploy-mb-stable.service
root_deployed=1
trap - EXIT
echo '[macbook-root-migration] root-managed mb-stable deployment completed.' >&2
