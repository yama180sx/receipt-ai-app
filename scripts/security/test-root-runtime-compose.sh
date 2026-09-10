#!/usr/bin/env bash
# 実credential・実データ・Docker daemonを使わず、root runtime Composeの合成契約を検証する。
set -euo pipefail

readonly repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
readonly temporary_directory="$(mktemp -d)"
trap 'rm -rf -- "${temporary_directory}"' EXIT

mkdir -p "${temporary_directory}/secrets"
for credential in \
  backend_database_url \
  backend_jwt_secret \
  backend_gemini_api_key \
  backend_ai_budget_discord_webhook \
  backend_smtp_user \
  backend_smtp_password \
  backend_smtp_from \
  postgres_password; do
  : > "${temporary_directory}/secrets/${credential}"
done

printf 'LOG_LEVEL=contract-test\n' > "${temporary_directory}/backend.env"

write_compose_env() {
  local command="$1"
  cat > "${temporary_directory}/compose.env" <<EOF
ENV_NAME=contract
COMPOSE_PROJECT_NAME=receipt-contract
UID=1000
GID=1000
BACKEND_COMMAND=${command}
NODE_ENV=development
HOST_IP=192.0.2.10
WEB_PORT=18080
BACKEND_PORT=13000
DEV_PORT=18081
DB_PORT=15432
REDIS_PORT=16379
EXPO_PORT_1=19000
EXPO_PORT_2=19001
DB_USER=contract
DB_NAME=contract
DB_PASSWORD=managed-by-file
RECAIPT_UPLOADS_DIR=${temporary_directory}/uploads
RECAIPT_PGDATA_DIR=${temporary_directory}/pgdata
RECAIPT_REDISDATA_DIR=${temporary_directory}/redisdata
RECAIPT_BACKEND_ENV_FILE=${temporary_directory}/backend.env
EOF
}

verify_command() {
  local command="$1"
  local expected="$2"
  local output="${temporary_directory}/compose-${expected// /-}.yaml"

  write_compose_env "${command}"
  RECAIPT_SECRETS_DIR="${temporary_directory}/secrets" \
    docker compose --project-directory "${repo_root}" \
      --env-file "${temporary_directory}/compose.env" \
      -f "${repo_root}/docker-compose.yml" \
      -f "${repo_root}/docker-compose.secrets.yml" \
      -f "${repo_root}/docker-compose.runtime.yml" \
      config > "${output}"

  grep -Fq '      - npm' "${output}"
  grep -Fq '      - run' "${output}"
  grep -Fq "      - ${expected##* }" "${output}"
  grep -Fq 'DATABASE_URL_FILE: /run/secrets/backend_database_url' "${output}"
  grep -Fq 'LOG_LEVEL: contract-test' "${output}"
}

verify_command 'npm run dev' 'npm run dev'
verify_command 'npm run start' 'npm run start'

echo '[OK] root runtime Compose contract is valid.'
