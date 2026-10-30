# 安定版のNode.jsを使用
FROM node:22-slim@sha256:4b150b48b4116e2a22f2c39cc27025fbf4f153e2078fd3b14d159fdb5c7279da

# OSの依存パッケージをインストール（Prisma等の動作に必要）
RUN apt-get update && apt-get install -y \
    openssl \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# バックエンドアプリが内部で利用するポート（通常3000）を公開
EXPOSE 3000
