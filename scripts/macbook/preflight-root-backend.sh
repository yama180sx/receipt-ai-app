#!/usr/bin/env bash
# root管理mb-stable backendを切替前に非公開の一時コンテナで検証する。
set -euo pipefail

readonly INSTANCE_NAME='mb-stable'
readonly CONFIG_ROOT='/etc/receipt-ai-app'
readonly APP_DIRECTORY="/srv/receipt-ai-app/${INSTANCE_NAME}"
readonly RUNTIME_DIRECTORY="/run/receipt-ai-app-${INSTANCE_NAME}-preflight"
readonly SECRET_DIRECTORY="${RUNTIME_DIRECTORY}/secrets"
readonly CONTAINER_NAME="receipt-${INSTANCE_NAME}-preflight-backend"

die() { echo "[macbook-root-preflight] $1" >&2; exit 1; }
[ "$(id -u)" -eq 0 ] || die 'run with sudo; do not share the password'
[ -r "${CONFIG_ROOT}/${INSTANCE_NAME}.env" ] || die 'root non-secret config is unavailable'
[ -r "${APP_DIRECTORY}/backend/.env" ] || die 'root backend non-secret config is unavailable'
docker network inspect "${INSTANCE_NAME}_default" >/dev/null 2>&1 || die 'current mb-stable network is unavailable'

cleanup() {
  docker rm -f "${CONTAINER_NAME}" >/dev/null 2>&1 || true
  rm -rf -- "${RUNTIME_DIRECTORY}"
}
trap cleanup EXIT

install -d -o root -g root -m 0700 "${SECRET_DIRECTORY}"
for credential in backend_database_url backend_jwt_secret backend_totp_encryption_key \
  backend_gemini_api_key backend_ai_budget_discord_webhook backend_smtp_user \
  backend_smtp_password backend_smtp_from; do
  systemd-creds decrypt "${CONFIG_ROOT}/credentials/${INSTANCE_NAME}/${credential}.cred" \
    "${SECRET_DIRECTORY}/${credential}"
  chmod 0444 "${SECRET_DIRECTORY}/${credential}"
done

# root runtimeと同じimage・user・secret file契約で起動する。host portは公開しない。
docker run -d --rm --name "${CONTAINER_NAME}" --network "${INSTANCE_NAME}_default" \
  --user 1000:1000 --env-file "${APP_DIRECTORY}/backend/.env" \
  -e DATABASE_URL_FILE=/run/secrets/backend_database_url \
  -e JWT_SECRET_FILE=/run/secrets/backend_jwt_secret \
  -e TOTP_ENCRYPTION_KEY_FILE=/run/secrets/backend_totp_encryption_key \
  -e GEMINI_API_KEY_FILE=/run/secrets/backend_gemini_api_key \
  -e AI_BUDGET_DISCORD_WEBHOOK_URL_FILE=/run/secrets/backend_ai_budget_discord_webhook \
  -e SMTP_USER_FILE=/run/secrets/backend_smtp_user \
  -e SMTP_PASSWORD_FILE=/run/secrets/backend_smtp_password \
  -e SMTP_FROM_FILE=/run/secrets/backend_smtp_from \
  -v "${SECRET_DIRECTORY}:/run/secrets:ro" \
  "${INSTANCE_NAME}-backend" npm run start >/dev/null

for attempt in $(seq 1 20); do
  if docker exec "${CONTAINER_NAME}" node -e '
    fetch("http://127.0.0.1:3000/health").then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1));
  ' >/dev/null 2>&1; then
    echo '[macbook-root-preflight] backend health is OK.'
    exit 0
  fi
  sleep 1
done

# 生ログではなく、値なしの既存startup分類とDocker stateだけを出す。
docker logs "${CONTAINER_NAME}" 2>&1 | grep -F 'Fatal startup configuration error [' || true
docker inspect --format '[macbook-root-preflight] state={{.State.Status}} exit={{.State.ExitCode}} error={{.State.Error}}' \
  "${CONTAINER_NAME}" >&2 || true
die 'backend preflight health check failed'
