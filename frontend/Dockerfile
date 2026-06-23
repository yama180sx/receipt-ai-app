# 安定版のNode.jsを使用
FROM node:20-slim

# OSの依存パッケージをインストール
RUN apt-get update && apt-get install -y \
    git \
    openssl \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Expo CLIをグローバルにインストール
RUN npm config set fetch-retries 5 \
  && npm config set fetch-retry-mintimeout 20000 \
  && npm config set fetch-retry-maxtimeout 120000 \
  && npm install -g expo-cli

WORKDIR /app

# コンテナ起動時に保持するポート（Expo用。DEV_PORT は 8081 dev / 8082 stable）
EXPOSE 8081 8082 19000 19001 19002

CMD ["bash"]