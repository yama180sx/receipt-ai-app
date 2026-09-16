#!/bin/bash

# 呼出元で BACKUP_DISCORD_WEBHOOK_URL を設定する。秘密値はGit管理しない。
WEBHOOK_URL="${BACKUP_DISCORD_WEBHOOK_URL:-}"

# 通知関数
send_notification() {
    local status=$1    # SUCCESS or ERROR
    local message=$2
    local color=32768  # Green (Success)
    
    if [ "$status" = "ERROR" ]; then
        color=16711680 # Red (Error)
    fi

    [ -n "$WEBHOOK_URL" ] || return 0
    # Discord への送信 (JSON形式)
    curl -H "Content-Type: application/json" \
         -X POST \
         -d "{
               \"embeds\": [{
                 \"title\": \"[$status] T320 Server Alert\",
                 \"description\": \"$message\",
                 \"color\": $color,
                 \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"
               }]
             }" \
         $WEBHOOK_URL
}
