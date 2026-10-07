#!/usr/bin/env bash
# Issue #118-2-1: production Composeへ重ねるVPN限定Expo Go overlayの静的契約検査。
set -euo pipefail

readonly repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
readonly temporary_directory="$(mktemp -d)"
trap 'rm -rf -- "${temporary_directory}"' EXIT

mkdir -p "${temporary_directory}/secrets"
for credential in \
  backend_database_url \
  backend_jwt_secret \
  backend_totp_encryption_key \
  backend_gemini_api_key \
  backend_ai_budget_discord_webhook \
  backend_smtp_user \
  backend_smtp_password \
  backend_smtp_from \
  postgres_password; do
  : > "${temporary_directory}/secrets/${credential}"
done

cat > "${temporary_directory}/backend.env" <<'EOF'
PORT=3000
REDIS_HOST=redis
REDIS_PORT_INTERNAL=6379
CORS_ORIGIN=http://100.64.0.10:18080
LOG_LEVEL=contract-test
EOF

cat > "${temporary_directory}/compose.env" <<EOF
ENV_NAME=stable
COMPOSE_PROJECT_NAME=receipt-vps-expo-contract
WEB_PORT=18080
EXPO_DEV_PORT=18082
EXPO_VPN_BIND_IP=100.64.0.10
EXPO_VPN_HOST=100.64.0.10
DB_USER=contract
DB_NAME=contract
RECAIPT_UPLOADS_DIR=${temporary_directory}/uploads
RECAIPT_PGDATA_DIR=${temporary_directory}/pgdata
RECAIPT_QUEUE_DATA_DIR=${temporary_directory}/valkeydata
RECAIPT_BACKEND_ENV_FILE=${temporary_directory}/backend.env
EOF

readonly rendered_compose="${temporary_directory}/compose.yaml"
RECAIPT_SECRETS_DIR="${temporary_directory}/secrets" \
  docker compose --project-directory "${repo_root}" \
    --env-file "${temporary_directory}/compose.env" \
    -f "${repo_root}/docker-compose.production.yml" \
    -f "${repo_root}/docker-compose.secrets.yml" \
    -f "${repo_root}/docker-compose.vps-expo-vpn.yml" \
    config > "${rendered_compose}"

service_block() {
  local service="$1"
  awk -v service="${service}" '
    $0 == "  " service ":" { printing = 1 }
    printing && $0 ~ /^  [a-zA-Z0-9_-]+:$/ && $0 != "  " service ":" { exit }
    printing { print }
  ' "${rendered_compose}"
}

for service in backend frontend frontend-dev db redis; do
  service_block "${service}" | grep -Fq "  ${service}:"
done

# VPN overlayはfrontendとMetroだけを固定VPN IPへ公開する。全IP・loopback以外の追加公開は認めない。
service_block frontend | grep -Fq 'host_ip: 100.64.0.10'
service_block frontend | grep -Fq 'published: "18080"'
service_block frontend-dev | grep -Fq 'host_ip: 100.64.0.10'
service_block frontend-dev | grep -Fq 'published: "18082"'

for service in backend db redis; do
  if service_block "${service}" | grep -Eq '^    ports:$'; then
    echo "[ERROR] ${service} must not publish a host port." >&2
    exit 1
  fi
done

if service_block frontend-dev | grep -Eq '(^    env_file:|(^    secrets:)|(/app/uploads)|(^    volumes:)|(^    stdin_open:)|(^    tty:))'; then
  echo '[ERROR] Expo VPN service must not receive secrets, persistent data, source mounts, or an interactive terminal.' >&2
  exit 1
fi

service_block frontend-dev | grep -Fq 'EXPO_PUBLIC_API_URL: http://100.64.0.10:18080/api'
service_block frontend-dev | grep -Fq 'REACT_NATIVE_PACKAGER_HOSTNAME: 100.64.0.10'
service_block frontend-dev | grep -Fq 'restart: unless-stopped'

if grep -Eq 'host_ip: (0\.0\.0\.0|127\.0\.0\.1)' "${rendered_compose}"; then
  echo '[ERROR] VPN Expo overlay must not bind frontend or Metro to all interfaces or loopback.' >&2
  exit 1
fi

grep -Fq 'internal: true' "${rendered_compose}"
grep -Fq 'FROM node:22-slim' "${repo_root}/frontend/Dockerfile.runtime-dev"

echo '[OK] VPS Expo VPN Compose contract is valid.'
