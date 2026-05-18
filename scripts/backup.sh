#!/bin/bash

# --- 环境判定ロジック ---
ENV=$1

if [ "$ENV" != "stable" ] && [ "$ENV" != "dev" ]; then
    echo "[ERROR] Usage: $0 {stable|dev}"
    exit 1
fi

# --- 設定項目 ---
PROJECT_ROOT=$(cd $(dirname "$0")/..; pwd)
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=7

# ★ Discord 設定
WEBHOOK_URL="https://discord.com/api/webhooks/1494659784304230442/Hh4scCNNv0hga2AtqMbUufCdaAaZUmmRrltAo4Ke5Pjq7QlS1iO1PIDIz5MAK399sY2Z"

# DB基本設定
DB_USER="cntadm"
DB_NAME="receipt_db"

# --- 環境別の動的分岐設定 ---
if [ "$ENV" = "stable" ]; then
    BACKUP_DIR="/mnt/raid_1t/backups/receipt-app"
    CONTAINER_NAME="receipt-stable-db"
    ENV_LABEL="PROD"
else
    BACKUP_DIR="/mnt/raid_1t/backups/receipt-app-dev"
    CONTAINER_NAME="receipt-dev-db" # ★修正: 実際のコンテナ名に一致
    ENV_LABEL="DEV"
fi

# --- 通知関数 ---
send_discord_alert() {
    local status=$1    # SUCCESS or ERROR
    local message=$2
    local color=32768  # 緑 (Success)
    [ "$status" = "ERROR" ] && color=16711680 # 赤 (Error)

    curl -H "Content-Type: application/json" \
            -X POST \
            -d "{
                \"embeds\": [{
                    \"title\": \"[$status] T320 ($ENV_LABEL) Backup Alert\",
                    \"description\": \"$message\",
                    \"color\": $color,
                    \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"
                }]
                }" \
            "$WEBHOOK_URL" > /dev/null 2>&1
}

# 1. バックアップ先ディレクトリ作成
mkdir -p "${BACKUP_DIR}/db"
mkdir -p "${BACKUP_DIR}/uploads"

# 2. .env からパスワードを抽出
DOTENV_FILE="${PROJECT_ROOT}/.env"
if [ -f "${DOTENV_FILE}" ]; then
    DB_PASS=$(grep '^DB_PASSWORD=' "${DOTENV_FILE}" | cut -d '=' -f 2-)
else
    msg="[ERROR] .env file not found at ${DOTENV_FILE}"
    echo "[$(date)] $msg"
    send_discord_alert "ERROR" "$msg"
    exit 1
fi

SOURCE_UPLOADS_DIR="${PROJECT_ROOT}/backend/uploads"

echo "[$(date)] ($ENV_LABEL) Backup started."

# 3. DBバックアップ
if [ ! "$(docker ps -q -f name=${CONTAINER_NAME})" ]; then
    msg="Container ${CONTAINER_NAME} is NOT running. ($ENV_LABEL) DB Backup aborted."
    echo "  -> [ERROR] $msg"
    send_discord_alert "ERROR" "$msg"
else
    docker exec -e PGPASSWORD="${DB_PASS}" ${CONTAINER_NAME} pg_dump -U ${DB_USER} ${DB_NAME} | gzip > "${BACKUP_DIR}/db/db_backup_${TIMESTAMP}.sql.gz"
    
    if [ ${PIPESTATUS[0]} -eq 0 ]; then
        echo "  -> ($ENV_LABEL) DB Backup SUCCESS."
    else
        msg="PostgreSQL Dump FAILED on ($ENV_LABEL)."
        echo "  -> [ERROR] $msg"
        send_discord_alert "ERROR" "$msg"
    fi
fi

# 4. 画像バックアップ
if [ -d "${SOURCE_UPLOADS_DIR}" ]; then
    # ★修正: 圧縮コマンド自体の成否を取得するため 2>/dev/null は外し、終了ステータスをチェック
    tar -czf "${BACKUP_DIR}/uploads/uploads_backup_${TIMESTAMP}.tar.gz" -C "${PROJECT_ROOT}/backend" "uploads"
    
    if [ $? -eq 0 ]; then
        echo "  -> ($ENV_LABEL) Uploads Backup SUCCESS."
    else
        msg="Tar archive creation FAILED on ($ENV_LABEL)."
        echo "  -> [ERROR] $msg"
        send_discord_alert "ERROR" "$msg"
    fi
else
    msg="Uploads directory NOT found at ${SOURCE_UPLOADS_DIR}."
    echo "  -> [ERROR] $msg"
    send_discord_alert "ERROR" "$msg"
fi

# 5. 世代管理
find "${BACKUP_DIR}/db" -name "*.gz" -mtime +${RETENTION_DAYS} -delete
find "${BACKUP_DIR}/uploads" -name "*.tar.gz" -mtime +${RETENTION_DAYS} -delete

echo "[$(date)] ($ENV_LABEL) Backup completed."