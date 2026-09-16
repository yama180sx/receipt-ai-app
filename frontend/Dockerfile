# Expo SDK 57 の要件を満たす Node.js を使用
FROM node:22-slim

# OSの依存パッケージをインストール
RUN apt-get update && apt-get install -y \
    git \
    openssl \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# コンテナ起動時に保持するポート（Expo用。DEV_PORT は 8081 dev / 8082 stable）
EXPOSE 8081 8082 19000 19001 19002

CMD ["bash"]
