#!/bin/sh
# Docker 内 Expo dev: ホストの DEV_PORT と一致させ、正しい URL を表示する
set -e

PORT="${DEV_PORT:-8081}"
HOST="${HOST_IP:-localhost}"
ENV="${ENV_NAME:-dev}"

echo ""
echo "=============================================="
echo " RecAIpt Expo Dev Server (${ENV})"
echo " Expo Go:  exp://${HOST}:${PORT}"
echo " Web:      http://${HOST}:${PORT}"
if [ "$ENV" = "stable" ]; then
  echo " 本番 Web: http://${HOST} （port 80）"
fi
echo "=============================================="
echo ""

exec npx expo start --web --port "${PORT}" --host lan
