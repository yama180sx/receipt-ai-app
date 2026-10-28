#!/bin/sh
# Docker 内 Expo dev: ホストの DEV_PORT と一致させ、正しい URL を表示する
set -e

PORT="${DEV_PORT:-8081}"
HOST="${HOST_IP:-localhost}"
ENV="${ENV_NAME:-dev}"
# Expo Go と development build のどちらにも接続先を案内できるよう、
# development build にインストール済みの scheme を明示する。
DEV_CLIENT_SCHEME="${EXPO_DEV_CLIENT_SCHEME:-exp+recaipt}"

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

# expo-dev-client が依存関係にあると、Expo CLI は指定なしでは development build を
# 自動選択し、QRを exp+<scheme>:// にする。frontend-devの既定QRはExpo Go用なので
# --go を明示する。一方で --go だけでは development build 用のURLを組み立てる scheme
# が未設定となり、/_expo/open?runtime=custom が空URLを返す。--scheme も明示して、
# Expo Go 用の既定QRと development build 用の起動URLを両方提供する。
#
# npx経由ではなくプロジェクトに固定されたCLIを直接起動する。--clear は前回の
# Metro変換キャッシュが接続先の変更をまたがないようにするためで、アプリデータや
# 永続データは削除しない。
exec ./node_modules/.bin/expo start \
  --port "${PORT}" \
  --host lan \
  --go \
  --scheme "${DEV_CLIENT_SCHEME}" \
  --clear
