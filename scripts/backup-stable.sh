#!/bin/bash

# --- 設定項目 ---
# スクリプトの場所からプロジェクトルート（1つ上の階層）を特定
PROJECT_ROOT=$(cd $(dirname "$0")/..; pwd)
BACKUP_DIR="/mnt/raid_1t/backups/receipt-app"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=7

# ★ Discord 設定 (取得したURLをここに貼り付け)
WEBHOOK_URL="https://discord.com/api/webhooks/1494659784304230442/Hh4scCNNv0hga2AtqMbUufCdaAaZUmmRrltAo4Ke5Pjq7QlS1iO1PIDIz5MAK399sY2Z"

# Docker設定
CONTAINER_NAME="receipt-stable-db" # 前回の成功時が「-1」付きなら修正してください
DB_USER="cntadm"
DB_NAME="receipt_db"

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
                    \"title\": \"[$status] T320 Backup Alert\",
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

echo "[$(date)] Backup started."

# 3. DBバックアップ
if [ ! "$(docker ps -q -f name=${CONTAINER_NAME})" ]; then
    msg="Container ${CONTAINER_NAME} is NOT running. DB Backup aborted."
    echo "  -> [ERROR] $msg"
    send_discord_alert "ERROR" "$msg"
else
    docker exec -e PGPASSWORD="${DB_PASS}" ${CONTAINER_NAME} pg_dump -U ${DB_USER} ${DB_NAME} | gzip > "${BACKUP_DIR}/db/db_backup_${TIMESTAMP}.sql.gz"
    
    if [ ${PIPESTATUS[0]} -eq 0 ]; then
        echo "  -> DB Backup SUCCESS."
    else
        msg="PostgreSQL Dump FAILED."
        echo "  -> [ERROR] $msg"
        send_discord_alert "ERROR" "$msg"
    fi
fi

# 4. 画像バックアップ
if [ -d "${SOURCE_UPLOADS_DIR}" ]; then
    tar -czf "${BACKUP_DIR}/uploads/uploads_backup_${TIMESTAMP}.tar.gz" -C "${PROJECT_ROOT}/backend" "uploads"
    echo "  -> Uploads Backup SUCCESS."
else
    msg="Uploads directory NOT found at ${SOURCE_UPLOADS_DIR}."
    echo "  -> [ERROR] $msg"
    send_discord_alert "ERROR" "$msg"
fi

# 5. 世代管理
find "${BACKUP_DIR}/db" -name "*.gz" -mtime +${RETENTION_DAYS} -delete
find "${BACKUP_DIR}/uploads" -name "*.tar.gz" -mtime +${RETENTION_DAYS} -delete

# 6. 完了通知 (成功時も通知したい場合はコメントアウトを外してください)
# send_discord_alert "SUCCESS" "Daily backup completed successfully on T320."

echo "[$(date)] Backup completed."