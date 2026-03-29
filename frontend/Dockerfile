# 安定版のNode.jsを使用
FROM node:20-slim

# OSの依存パッケージをインストール
RUN apt-get update && apt-get install -y \
    git \
    openssl \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Expo CLIをグローバルにインストール
RUN npm install -g expo-cli

WORKDIR /app

# コンテナ起動時に保持するポート（Expo用）
EXPOSE 8081 19000 19001 19002

CMD ["bash"]