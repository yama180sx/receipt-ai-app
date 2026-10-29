#!/bin/sh
# Docker 内 Expo Go 専用 Metro。development build 用frontend-devとは共有しない。
set -e

PORT="${EXPO_GO_PORT:-8083}"
HOST="${HOST_IP:-localhost}"
ENV="${ENV_NAME:-dev}"

# manifest が端末から到達可能なMetroを返すよう、起動直前に固定する。
export REACT_NATIVE_PACKAGER_HOSTNAME="${HOST}"
export EXPO_PACKAGER_PROXY_URL="http://${HOST}:${PORT}"

echo ""
echo "=============================================="
echo " RecAIpt Expo Go Server (${ENV})"
echo " Expo Go: exp://${HOST}:${PORT}"
echo "=============================================="
echo ""

if [ ! -f node_modules/expo-router/build/global-state/storeContext.js ]; then
  echo "Repairing frontend dependencies (npm install)..."
  npm install
  echo ""
fi

# expo-dev-clientが依存にあっても、このプロセスはExpo Goのみに向ける。
# --clearはMetro変換キャッシュだけを削除し、端末データや永続データには触れない。
exec ./node_modules/.bin/expo start \
  --port "${PORT}" \
  --host lan \
  --go \
  --clear
