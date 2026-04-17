#!/bin/bash

# --- 設定項目 ---
# Discord の Webhook URL (後ほど取得して貼り付けます)
WEBHOOK_URL="https://discord.com/api/webhooks/1494659784304230442/Hh4scCNNv0hga2AtqMbUufCdaAaZUmmRrltAo4Ke5Pjq7QlS1iO1PIDIz5MAK399sY2Z"

# 通知関数
send_notification() {
    local status=$1    # SUCCESS or ERROR
    local message=$2
    local color=32768  # Green (Success)
    
    if [ "$status" = "ERROR" ]; then
        color=16711680 # Red (Error)
    fi

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