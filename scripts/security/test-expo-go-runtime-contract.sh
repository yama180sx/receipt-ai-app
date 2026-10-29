#!/usr/bin/env bash
# Expo GoとAndroid development buildが同じMetroを共有しないことを静的に検査する。
set -euo pipefail

readonly root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
readonly dev_server="${root}/frontend/scripts/expo-dev-server.sh"
readonly go_server="${root}/frontend/scripts/expo-go-server.sh"
readonly go_helper="${root}/ops/systemd/libexec/receipt-expo-go"

test -x "${dev_server}"
test -x "${go_server}"
test -f "${go_helper}"

grep -Fq -- '--dev-client' "${dev_server}"
if grep -Eq '^[[:space:]]*--go([[:space:]\\]|$)' "${dev_server}"; then
  echo '[ERROR] development build server must not target Expo Go.' >&2
  exit 1
fi

grep -Fq -- '--go' "${go_server}"
if grep -Eq '^[[:space:]]*--dev-client([[:space:]\\]|$)' "${go_server}"; then
  echo '[ERROR] Expo Go server must not target a development build.' >&2
  exit 1
fi

grep -Fq 'frontend-go:' "${root}/docker-compose.yml"
grep -Fq 'profiles: ["expo-go"]' "${root}/docker-compose.yml"
grep -Fq 'command: sh /app/scripts/expo-go-server.sh' "${root}/docker-compose.yml"
grep -Fq 'EXPO_GO_PORT: ${EXPO_GO_PORT:-8083}' "${root}/docker-compose.runtime.yml"

go_runtime_block="$(awk '
  /^  frontend-go:$/ { printing = 1 }
  printing { print }
  printing && /^  db:$/ { exit }
' "${root}/docker-compose.runtime.yml")"
if printf '%s\n' "${go_runtime_block}" | grep -Eq '(^    secrets:)|(/app/uploads)|(^    stdin_open: true)|(^    tty: true)|(- \./))'; then
  echo '[ERROR] Expo Go runtime must not receive secrets, persistent data, source mounts, or an interactive terminal.' >&2
  exit 1
fi
printf '%s\n' "${go_runtime_block}" | grep -Fqx '    env_file: !reset []'
printf '%s\n' "${go_runtime_block}" | grep -Fqx '    stdin_open: false'
printf '%s\n' "${go_runtime_block}" | grep -Fqx '    tty: false'
printf '%s\n' "${go_runtime_block}" | grep -Fqx '      - /etc/localtime:/etc/localtime:ro'

for environment in dev stable; do
  unit="${root}/ops/systemd/units/receipt-expo-go-${environment}.service"
  test -f "${unit}"
  grep -Fqx "ExecStart=/usr/local/libexec/receipt-expo-go ${environment} start" "${unit}"
  grep -Fqx "ExecStop=/usr/local/libexec/receipt-expo-go ${environment} stop" "${unit}"
done

for expected in \
  'docker compose --ansi never --profile expo-go' \
  '--env-file "${COMPOSE_ENV_FILE}"' \
  'up -d --no-deps --force-recreate frontend-go' \
  'stop frontend-go' \
  'Expo Go Metro started without exposing secrets'; do
  grep -Fq -- "${expected}" "${go_helper}"
done

if grep -Fq 'docker-compose.secrets.yml' "${go_helper}"; then
  echo '[ERROR] Expo Go helper must not load application secrets.' >&2
  exit 1
fi

grep -Fq 'EXPO_GO_PORT="${EXPO_GO_PORT:-8083}"' "${root}/ops/systemd/libexec/receipt-deploy"
grep -Fq 'run_compose build backend frontend frontend-dev frontend-go' "${root}/ops/systemd/libexec/receipt-deploy"

temporary_directory="$(mktemp -d)"
trap 'rm -rf -- "${temporary_directory}"' EXIT
cat > "${temporary_directory}/compose.env" <<EOF
ENV_NAME=contract
COMPOSE_PROJECT_NAME=receipt-expo-go-contract
UID=1000
GID=1000
BACKEND_COMMAND=npm run dev
NODE_ENV=development
HOST_IP=192.0.2.10
WEB_PORT=18080
BACKEND_PORT=13000
DEV_PORT=18081
EXPO_GO_PORT=18083
DB_PORT=15432
REDIS_PORT=16379
EXPO_PORT_1=19000
EXPO_PORT_2=19001
DB_USER=contract
DB_NAME=contract
DB_PASSWORD=contract-only
RECAIPT_UPLOADS_DIR=${temporary_directory}/uploads
RECAIPT_PGDATA_DIR=${temporary_directory}/pgdata
RECAIPT_REDISDATA_DIR=${temporary_directory}/redisdata
RECAIPT_QUEUE_DATA_DIR=${temporary_directory}/valkeydata
RECAIPT_BACKEND_ENV_FILE=${temporary_directory}/backend.env
EOF
printf 'LOG_LEVEL=contract-test\n' > "${temporary_directory}/backend.env"
docker compose --profile expo-go --project-directory "${root}" \
  --env-file "${temporary_directory}/compose.env" \
  -f "${root}/docker-compose.yml" \
  -f "${root}/docker-compose.runtime.yml" \
  config > "${temporary_directory}/compose.yaml"

effective_go_block="$(awk '
  $0 == "  frontend-go:" { printing = 1 }
  printing && $0 ~ /^  [a-zA-Z0-9_-]+:$/ && $0 != "  frontend-go:" { exit }
  printing { print }
' "${temporary_directory}/compose.yaml")"
printf '%s\n' "${effective_go_block}" | grep -Fq 'published: "18083"'
if printf '%s\n' "${effective_go_block}" | grep -Eq '(^    secrets:)|(/app/uploads)|(source: .*/frontend)|(stdin_open: true)|(tty: true)'; then
  echo '[ERROR] effective Expo Go runtime has an unsafe mount or secret.' >&2
  exit 1
fi

echo '[OK] Expo Go and development-build runtimes are isolated.'
