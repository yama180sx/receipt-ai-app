#!/bin/sh
# Docker 内 Expo dev: ホストの DEV_PORT と一致させ、正しい URL を表示する
set -e

PORT="${DEV_PORT:-8081}"
HOST="${HOST_IP:-localhost}"
ENV="${ENV_NAME:-dev}"

# Expo SDK 58 の manifest は、CLIを起動したプロセス自身の環境を基に
# bundle URL / debuggerHost を生成する。Composeの環境変数をそのまま継承する
# だけにせず、起動直前に同じVPN到達先を明示して、Metro・manifest・表示URLを
# 一つの接続先へそろえる。
export REACT_NATIVE_PACKAGER_HOSTNAME="${HOST}"
export EXPO_PACKAGER_PROXY_URL="http://${HOST}:${PORT}"

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

# node_modules が不完全だと expo-router のバンドルが失敗する（EXPO_ROUTER_APP_ROOT 等）
if [ ! -f node_modules/expo-router/build/global-state/storeContext.js ]; then
  echo "Repairing frontend dependencies (npm install)..."
  npm install
  echo ""
fi

# npx経由ではなくプロジェクトに固定されたCLIを直接起動する。--clear は前回の
# Metro変換キャッシュが接続先の変更をまたがないようにするためで、アプリデータや
# 永続データは削除しない。
exec ./node_modules/.bin/expo start --port "${PORT}" --host lan --clear
