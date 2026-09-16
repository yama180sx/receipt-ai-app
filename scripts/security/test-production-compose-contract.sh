#!/usr/bin/env bash
# Issue #118-1-1: OCI実機・credential・Docker daemonを使わず、本番Composeの境界を確認する。
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
CORS_ORIGIN=https://receipt.example.invalid
LOG_LEVEL=contract-test
EOF

cat > "${temporary_directory}/compose.env" <<EOF
ENV_NAME=oracle-contract
COMPOSE_PROJECT_NAME=receipt-oracle-contract
WEB_PORT=18080
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
    config > "${rendered_compose}"

service_block() {
  local service="$1"
  awk -v service="${service}" '
    $0 == "  " service ":" { printing = 1 }
    printing && $0 ~ /^  [a-zA-Z0-9_-]+:$/ && $0 != "  " service ":" { exit }
    printing { print }
  ' "${rendered_compose}"
}

for service in backend frontend db redis; do
  service_block "${service}" | grep -Fq "  ${service}:"
done

if grep -Fq 'frontend-dev' "${rendered_compose}"; then
  echo '[ERROR] production Compose must not include the Expo development server.' >&2
  exit 1
fi

for service in backend db redis; do
  if service_block "${service}" | grep -Eq '^    ports:$'; then
    echo "[ERROR] ${service} must not publish a host port." >&2
    exit 1
  fi
done

service_block frontend | grep -Fq 'published: "18080"'
service_block backend | grep -Fq 'target: /app/uploads'
service_block db | grep -Fq 'target: /var/lib/postgresql'
service_block redis | grep -Fq 'target: /data'

if grep -Eq '(\./backend|\./frontend):/app' "${rendered_compose}"; then
  echo '[ERROR] production Compose must not source-bind-mount an application directory.' >&2
  exit 1
fi

service_block backend | grep -Fq 'NODE_ENV: production'
service_block backend | grep -Fq 'DATABASE_URL_FILE: /run/secrets/backend_database_url'
service_block backend | grep -Fq 'TOTP_ENCRYPTION_KEY_FILE: /run/secrets/backend_totp_encryption_key'
service_block redis | grep -Fq 'valkey/valkey:8.1.10-alpine3.24@sha256:'
grep -Fq 'internal: true' "${rendered_compose}"

grep -Fq 'RUN npm ci' "${repo_root}/backend/Dockerfile.runtime"
grep -Fq 'RUN npx prisma generate' "${repo_root}/backend/Dockerfile.runtime"
grep -Fq 'FROM node:20-slim' "${repo_root}/backend/Dockerfile.runtime"
grep -Fq 'FROM node:22-alpine AS builder' "${repo_root}/frontend/Dockerfile.web"

echo '[OK] production Compose contract is valid.'
