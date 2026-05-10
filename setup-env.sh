#!/bin/bash

# 使用法: ./setup-env.sh [dev|stable]
ENV=$1

if [[ "$ENV" != "dev" && "$ENV" != "stable" ]]; then
    echo "Usage: ./setup-env.sh [dev|stable]"
    exit 1
fi

# 1. 秘密情報の読み込み
SECRET_FILE=".env.secret"
if [ ! -f "$SECRET_FILE" ]; then
    echo "❌ Error: $SECRET_FILE not found!"
    exit 1
fi
source "$SECRET_FILE"

# 2. 共通定数
HOST_IP="192.168.1.32"
UID_VAL=$(id -u)
GID_VAL=$(id -g)
DB_USER="cntadm"
DB_NAME="receipt_db"
# [Issue #69] Redis内部ポートの固定
REDIS_PORT_INTERNAL=6379

# 3. 環境ごとの切り替え設定
if [ "$ENV" == "dev" ]; then
    ENV_NAME="dev"
    NODE_ENV="development"
    BACKEND_PORT=3001
    WEB_PORT=8080
    DEV_PORT=8081
    EXPO_PORT_1=19000
    EXPO_PORT_2=19001
    EXPO_PACKAGER_PROXY_URL="http://$HOST_IP:$DEV_PORT"
    DB_PORT=5433
    REDIS_PORT=6380
    BACKEND_COMMAND="npm run dev"
    CORS_ORIGIN="http://localhost:$DEV_PORT,http://$HOST_IP:$DEV_PORT,exp://$HOST_IP:$DEV_PORT,http://$HOST_IP:$WEB_PORT"
    GEMINI_MODEL="gemini-flash-latest"
else
    ENV_NAME="stable"
    NODE_ENV="production"
    BACKEND_PORT=3000
    WEB_PORT=80
    DEV_PORT=8082
    EXPO_PORT_1=19010
    EXPO_PORT_2=19011
    EXPO_PACKAGER_PROXY_URL="http://$HOST_IP:$DEV_PORT"
    DB_PORT=5432
    REDIS_PORT=6379
    BACKEND_COMMAND="npm run start"
    CORS_ORIGIN="http://$HOST_IP:$WEB_PORT"
    GEMINI_MODEL="gemini-flash-latest"
fi

# 4. ルート .env (docker-compose.yml 用)
cat <<EOF > .env
ENV_NAME=$ENV_NAME
NODE_ENV=$NODE_ENV
COMPOSE_PROJECT_NAME=receipt-$ENV_NAME
UID=$UID_VAL
GID=$GID_VAL
HOST_IP=$HOST_IP
BACKEND_COMMAND=$BACKEND_COMMAND
BACKEND_PORT=$BACKEND_PORT
CORS_ORIGIN=$CORS_ORIGIN
WEB_PORT=$WEB_PORT
DEV_PORT=$DEV_PORT
EXPO_PORT_1=$EXPO_PORT_1
EXPO_PORT_2=$EXPO_PORT_2
EXPO_PACKAGER_PROXY_URL=$EXPO_PACKAGER_PROXY_URL
DB_PORT=$DB_PORT
DB_USER=$DB_USER
DB_NAME=$DB_NAME
DB_PASSWORD=$DB_PASS
REDIS_PORT=$REDIS_PORT
EOF

# 5. frontend/.env
cat <<EOF > frontend/.env
EXPO_PUBLIC_API_URL="http://$HOST_IP:$BACKEND_PORT/api"
EXPO_PUBLIC_API_TOKEN="$API_TOKEN"
EOF

# 6. backend/.env
cat <<EOF > backend/.env
DATABASE_URL="postgresql://$DB_USER:$DB_PASS@db:5432/$DB_NAME?schema=public"
DB_PASSWORD=$DB_PASS
PORT=3000
LOG_LEVEL=$( [ "$ENV" == "stable" ] && echo "info" || echo "debug" )
NODE_ENV=$NODE_ENV
CORS_ORIGIN="$CORS_ORIGIN"
GEMINI_API_KEY="$GEMINI_API_KEY"
GEMINI_MODEL="$GEMINI_MODEL"
GEMINI_RETRY_COUNT=3
GEMINI_RETRY_DELAY=2000
JWT_SECRET="$JWT_SECRET"
JWT_EXPIRES_IN="30d"
REDIS_HOST=redis
REDIS_PORT_INTERNAL=$REDIS_PORT_INTERNAL
EOF

echo "✅ Setup complete for $ENV_NAME. Project name: receipt-$ENV_NAME"