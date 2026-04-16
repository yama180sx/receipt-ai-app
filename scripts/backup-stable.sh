#!/bin/bash

# --- 設定項目 ---
# スクリプトの場所からプロジェクトルート（1つ上の階層）を特定
PROJECT_ROOT=$(cd $(dirname "$0")/..; pwd)
BACKUP_DIR="/mnt/raid_1t/backups/receipt-app"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=7

# Docker設定
CONTAINER_NAME="receipt-stable-db"
DB_USER="cntadm"
DB_NAME="receipt_db"

# 1. バックアップ先ディレクトリ作成
mkdir -p "${BACKUP_DIR}/db"
mkdir -p "${BACKUP_DIR}/uploads"

# 2. .env からパスワードを抽出
DOTENV_FILE="${PROJECT_ROOT}/.env"
if [ -f "${DOTENV_FILE}" ]; then
    DB_PASS=$(grep '^DB_PASSWORD=' "${DOTENV_FILE}" | cut -d '=' -f 2-)
else
    echo "[$(date)] [ERROR] .env file not found at ${DOTENV_FILE}"
    exit 1
fi

SOURCE_UPLOADS_DIR="${PROJECT_ROOT}/backend/uploads"

echo "[$(date)] Backup started."

# 3. DBバックアップ
if [ ! "$(docker ps -q -f name=${CONTAINER_NAME})" ]; then
    echo "  -> [ERROR] Container ${CONTAINER_NAME} is NOT running."
else
    docker exec -e PGPASSWORD="${DB_PASS}" ${CONTAINER_NAME} pg_dump -U ${DB_USER} ${DB_NAME} | gzip > "${BACKUP_DIR}/db/db_backup_${TIMESTAMP}.sql.gz"
    [ ${PIPESTATUS[0]} -eq 0 ] && echo "  -> DB Backup SUCCESS." || echo "  -> [ERROR] DB Backup FAILED."
fi

# 4. 画像バックアップ
if [ -d "${SOURCE_UPLOADS_DIR}" ]; then
    tar -czf "${BACKUP_DIR}/uploads/uploads_backup_${TIMESTAMP}.tar.gz" -C "${PROJECT_ROOT}/backend" "uploads"
    echo "  -> Uploads Backup SUCCESS."
else
    echo "  -> [ERROR] Uploads directory NOT found."
fi

# 5. 世代管理
find "${BACKUP_DIR}/db" -name "*.gz" -mtime +${RETENTION_DAYS} -delete
find "${BACKUP_DIR}/uploads" -name "*.tar.gz" -mtime +${RETENTION_DAYS} -delete

echo "[$(date)] Backup completed."