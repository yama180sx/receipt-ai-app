# 安定版のNode.jsを使用
FROM node:20-slim

# OSの依存パッケージをインストール（Prisma等の動作に必要）
RUN apt-get update && apt-get install -y \
    openssl \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# バックエンドアプリが内部で利用するポート（通常3000）を公開
EXPOSE 3000