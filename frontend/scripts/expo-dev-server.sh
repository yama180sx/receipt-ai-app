#!/bin/sh
# Docker 内 Expo dev: ホストの DEV_PORT と一致させ、正しい URL を表示する
set -e

PORT="${DEV_PORT:-8081}"
HOST="${HOST_IP:-localhost}"
ENV="${ENV_NAME:-dev}"
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
echo " Dev build: exp+recaipt://expo-development-client/?url=http%3A%2F%2F${HOST}%3A${PORT}"
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

# frontend-dev は Android development build 専用の Metro サーバーである。
# Expo Go 用の --go と development build 用の exp+<scheme> URL を同じ起動プロセスへ
# 混在させると、端末がどちらのランタイム向け bundle を実行するか判別できない。
# --dev-client を明示して、manifest・QR・手入力URLを development build の経路に統一する。
# Expo Go は別の起動経路（Issue #142）で扱う。
#
# npx経由ではなくプロジェクトに固定されたCLIを直接起動する。--clear は前回の
# Metro変換キャッシュが接続先の変更をまたがないようにするためで、アプリデータや
# 永続データは削除しない。
exec ./node_modules/.bin/expo start \
  --port "${PORT}" \
  --host lan \
  --dev-client \
  --scheme "${DEV_CLIENT_SCHEME}" \
  --clear
