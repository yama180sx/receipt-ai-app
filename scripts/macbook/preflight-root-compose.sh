#!/usr/bin/env bash
# 実際のroot Compose secret mountを、既存mb-stableを停止せず検証する。
set -euo pipefail

readonly INSTANCE_NAME='mb-stable'
readonly PREFLIGHT_INSTANCE_NAME='mb-stable-preflight'
readonly APP_DIRECTORY="/srv/receipt-ai-app/${INSTANCE_NAME}"
readonly RUNTIME_DIRECTORY="/run/receipt-ai-app-${INSTANCE_NAME}"
readonly COMPOSE_ENV_FILE="${RUNTIME_DIRECTORY}/compose.env"
readonly PREFLIGHT_RUNTIME_DIRECTORY="/run/receipt-ai-app-${INSTANCE_NAME}-compose-preflight"
readonly REPOSITORY_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

die() { echo "[macbook-root-compose-preflight] $1" >&2; exit 1; }
[ "$(id -u)" -eq 0 ] || die 'run with sudo; do not share the password'
[ -r "${COMPOSE_ENV_FILE}" ] || die 'root runtime compose configuration is unavailable'
docker network inspect "${INSTANCE_NAME}_default" >/dev/null 2>&1 || die 'current mb-stable network is unavailable'

readonly SECRET_DIRECTORY="${PREFLIGHT_RUNTIME_DIRECTORY}/secrets"
install -d -o root -g root -m 0700 "${SECRET_DIRECTORY}"
for credential in backend_database_url backend_jwt_secret backend_totp_encryption_key \
  backend_gemini_api_key backend_ai_budget_discord_webhook backend_smtp_user \
  backend_smtp_password backend_smtp_from postgres_password; do
  systemd-creds decrypt --name="${credential}" \
    "/etc/receipt-ai-app/credentials/${INSTANCE_NAME}/${credential}.cred" \
    "${SECRET_DIRECTORY}/${credential}"
  chmod 0444 "${SECRET_DIRECTORY}/${credential}"
done

run_compose() {
  INSTANCE_NAME="${PREFLIGHT_INSTANCE_NAME}" COMPOSE_PROJECT_NAME="${PREFLIGHT_INSTANCE_NAME}" \
    DOCKER_CONFIG="${RUNTIME_DIRECTORY}/docker-config" \
    RECAIPT_SECRETS_DIR="${SECRET_DIRECTORY}" \
    docker compose --project-directory "${APP_DIRECTORY}" --env-file "${COMPOSE_ENV_FILE}" \
      -f "${APP_DIRECTORY}/docker-compose.yml" \
      -f "${APP_DIRECTORY}/docker-compose.secrets.yml" \
      -f "${APP_DIRECTORY}/docker-compose.runtime.yml" \
      -f "${REPOSITORY_ROOT}/docker-compose.root-preflight.yml" "$@"
}

cleanup() {
  run_compose down --remove-orphans >/dev/null 2>&1 || true
  rm -rf -- "${PREFLIGHT_RUNTIME_DIRECTORY}"
}
trap cleanup EXIT

run_compose up -d --no-deps backend
for attempt in $(seq 1 20); do
  if run_compose exec -T backend node -e '
    fetch("http://127.0.0.1:3000/health").then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1));
  ' >/dev/null 2>&1; then
    echo '[macbook-root-compose-preflight] backend health is OK.'
    exit 0
  fi
  sleep 1
done

# 生ログではなく、値なしstartup分類とcontainer stateだけを表示する。
docker logs "receipt-${PREFLIGHT_INSTANCE_NAME}-backend" 2>&1 | grep -F 'Fatal startup configuration error [' || true
docker inspect --format '[macbook-root-compose-preflight] state={{.State.Status}} exit={{.State.ExitCode}} error={{.State.Error}}' \
  "receipt-${PREFLIGHT_INSTANCE_NAME}-backend" >&2 || true
die 'root Compose backend health check failed'
