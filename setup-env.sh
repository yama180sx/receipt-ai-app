#!/usr/bin/env bash
# 旧T320運用向けの設定生成スクリプト。Issue #129-1で廃止した。
#
# このスクリプトは以前、平文 .env の生成、.env.secret の読取り、ユーザーcronの
# 登録を行っていた。現在のdev／stableはroot管理deploy、encrypted credential、
# systemd timerを使用するため、旧方式を復活させないよう必ず失敗させる。
set -euo pipefail

cat >&2 <<'EOF'
setup-env.sh は廃止されています。

dev／stableの設定変更・デプロイ・バックアップには、root管理の
/etc/receipt-ai-app/{dev,stable}.env、encrypted credential、systemd unitを使用してください。

このスクリプトは .env、backend/.env、frontend/.env、cron を作成・変更しません。
詳細: ops/systemd/README.md および docs/design/operations.md
EOF

exit 1
