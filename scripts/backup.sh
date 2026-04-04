#!/bin/bash

# --- 設定項目 ---
PROJECT_ROOT=$(cd $(dirname "$0")/..; pwd)
BACKUP_DIR="/mnt/backup/receipt-app"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=7

# Docker設定
CONTAINER_NAME="receipt-ai-app-db-1"
DB_USER="cntadm"
DB_NAME="receipt_db"

# 1. .env からパスワードを抽出 (変数名を DB_PASSWORD に修正)
if [ -f "${PROJECT_ROOT}/backend/.env" ]; then
    # 行頭からの完全一致で検索し、イコール以降を取得
    DB_PASS=$(grep '^DB_PASSWORD=' "${PROJECT_ROOT}/backend/.env" | cut -d '=' -f 2-)
else
    echo "[$(date)] [ERROR] .env file not found at ${PROJECT_ROOT}/backend/.env"
    exit 1
fi

SOURCE_UPLOADS_DIR="${PROJECT_ROOT}/backend/uploads"

echo "[$(date)] Backup started."

# 2. コンテナの稼働確認
if [ ! "$(docker ps -q -f name=${CONTAINER_NAME})" ]; then
    echo "  -> [ERROR] Container ${CONTAINER_NAME} is NOT running. Aborting DB backup."
else
    # 3. DBバックアップ（PGPASSWORDを使用して認証を自動化）
    docker exec -e PGPASSWORD="${DB_PASS}" ${CONTAINER_NAME} pg_dump -U ${DB_USER} ${DB_NAME} | gzip > "${BACKUP_DIR}/db/db_backup_${TIMESTAMP}.sql.gz"

    if [ ${PIPESTATUS[0]} -eq 0 ]; then
        echo "  -> DB Backup SUCCESS."
    else
        echo "  -> [ERROR] DB Backup FAILED."
    fi
fi

# 4. 画像バックアップ (uploadsディレクトリ)
if [ -d "${SOURCE_UPLOADS_DIR}" ]; then
    tar -czf "${BACKUP_DIR}/uploads/uploads_backup_${TIMESTAMP}.tar.gz" -C "$(dirname ${SOURCE_UPLOADS_DIR})" "$(basename ${SOURCE_UPLOADS_DIR})"
    echo "  -> Uploads Backup SUCCESS."
else
    echo "  -> [ERROR] Uploads directory NOT found."
fi

# 5. 世代管理 (7日を過ぎたファイルを削除)
find "${BACKUP_DIR}/db" -name "*.gz" -mtime +${RETENTION_DAYS} -delete
find "${BACKUP_DIR}/uploads" -name "*.tar.gz" -mtime +${RETENTION_DAYS} -delete

echo "[$(date)] Backup completed."