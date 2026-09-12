# Oracle Cloud Always Free Ampere A1 デプロイ・二拠点運用 静的調査

調査日: 2026-08-14
対象: RecAIpt リポジトリの現行構成
調査方法: 設定・ソースコード・ロックファイルの静的確認。Docker 起動、依存関係の導入、ファイル変更以外の実行は行っていない。

## 1. 現行構成の要点

| 対象 | ファイル | 確認結果 |
| --- | --- | --- |
| コンテナ構成 | `docker-compose.yml` | backend、frontend（Nginx）、frontend-dev（Expo）、PostgreSQL、Redisを定義する開発寄りのCompose構成。 |
| backend | `backend/Dockerfile` | `node:20-slim` と OpenSSL を使用するが、ソースコピー、`npm ci`、`prisma generate` は行わない。 |
| Web frontend | `frontend/Dockerfile.web` | `node:20-alpine` で Expo Web をビルドし、`nginx:stable-alpine` で配信する。 |
| DB | `backend/prisma/schema.prisma` | Prisma の PostgreSQL データソース。接続文字列は `DATABASE_URL`。 |
| キュー | `backend/src/queues/receiptQueue.ts`、`backend/src/workers/receiptWorker.ts` | Redis を利用する BullMQ の `receipt-analysis` キュー。Workerは backend プロセスで起動する。 |
| 画像処理 | `backend/src/controllers/receiptController.ts` | Sharp で画像を回転補正、縮小、WebPへ変換する。 |

## 2. Oracle Cloud Always Free Ampere A1（Linux ARM64）互換性

総合判定: **B. 軽微な修正で動く可能性が高い**。

| 確認項目 | 判定 | 根拠 |
| --- | --- | --- |
| Dockerイメージ | 問題なし | `node:20-slim`、`node:20-alpine`、`postgres:18`、`redis:7-alpine`、`nginx:stable-alpine` を使用。公式イメージはARM64対応。 |
| x86固定処理 | 問題なし | `backend/Dockerfile`、`frontend/Dockerfile`、`frontend/Dockerfile.web` に `amd64`、`x86_64`、`x64` 固定処理はない。 |
| Compose platform 指定 | 問題なし | `docker-compose.yml` に `platform: linux/amd64` 等の指定はない。 |
| Prisma | 要確認 | Prisma 6系はLinux ARM64とOpenSSL 3系に対応する。`schema.prisma` に `binaryTargets` 固定はないが、A1内で `prisma generate` を行う工程が必要。 |
| Sharp | 要確認 | `backend/package-lock.json` に `@img/sharp-linux-arm64` とARM64向けlibvipsが含まれる。A1内で依存を導入すればNode 20 Debian/glibc環境で利用可能。 |
| PostgreSQL | 問題なし | `postgres:18` はARM64対応の公式イメージ。 |
| Redis | 問題なし | `redis:7-alpine` はARM64対応の公式イメージ。 |
| BullMQ | 問題なし | `bullmq` と `ioredis` はNode.js/Redis上で動作し、CPU固定処理はない。 |
| その他ネイティブ依存 | 要確認 | `bcrypt@6`、任意依存の`msgpackr-extract`、Webビルド時のesbuild/Rollupがネイティブバイナリを持つ。ロックファイルにはLinux ARM64用パッケージがある。 |

### A1デプロイ時の注意

- `docker-compose.yml` は `./backend:/app` をbind mountする一方、`backend/Dockerfile` は依存関係をイメージへ導入しない。
- x64環境で作った `node_modules` をA1へ持ち込むと、Prisma、Sharp、bcryptなどで実行形式不一致が起こり得る。
- A1内でARM64向けに `npm ci` と `prisma generate` を実行する本番用ビルド工程を用意する必要がある。
- 可変タグ（例: `postgres:18`、`nginx:stable-alpine`）は再現性のため、将来的に具体的なバージョンまたはdigestへ固定することを検討する。

## 3. 自宅サーバーとOracle Cloudの両立方針

実現可能。ただし、両拠点で同じデータへ同時書き込みする構成は採らない。

### 推奨構成

```text
利用者
  -> https://app.example.com
      -> Oracle Cloud（主系）
      -> 障害時のみDNS切替 -> 自宅サーバー（待機系）

管理者
  -> VPN / Tailscale / SSH鍵 + 接続元IP制限
      -> Oracle Cloud と 自宅サーバー
```

| 運用方式 | 用途 | 留意点 |
| --- | --- | --- |
| 完全分離 | Oracleを本番、自宅を開発・検証 | 最も単純で安全。データは共有しない。 |
| 主系・待機系 | Oracleを本番、自宅を障害復旧用 | PostgreSQLの片方向レプリケーション、または定期的な暗号化バックアップで同期する。通常は片方のみ書き込み可能にする。 |

自宅とOracleから同じPostgreSQLへインターネット越しに直接接続する構成、あるいはPostgreSQLのマルチマスター構成は、競合・運用負荷・復旧難度が高いため推奨しない。

## 4. 接続・公開方針

- 利用者向けには独自ドメインのHTTPS（TCP 443）のみを公開し、リバースプロキシで `/api` をbackendへ中継する。
- PostgreSQL（5432）、Redis（6379）、backend（3000）、Expo開発用ポートはインターネットへ公開しない。
- 管理アクセスはVPN経由を優先する。SSHを公開する場合は鍵認証、接続元IP制限、OS更新を必須とする。
- OCI側ではNetwork Security Group（NSG）を用いて最小権限の許可ルールにする。

## 5. 公開時の主なセキュリティ確認事項

| 優先度 | 現状・リスク | 該当箇所 | 対応方針 |
| --- | --- | --- | --- |
| 高 | TLSが未設定 | `frontend/nginx.conf` は `listen 80` のみ | HTTPS終端とHTTPからHTTPSへのリダイレクトを導入する。 |
| 高 | DB、Redis、backendがホストへポート公開される | `docker-compose.yml` | 公開対象を443だけに限定し、DB・RedisはDocker内部ネットワークに留める。 |
| 高 | Redis認証が任意 | `backend/src/config/redis.ts`、`docker-compose.yml` | Redisを外部公開しない。必要時は強いパスワードを設定する。 |
| 高 | 開発用サービスが同じComposeにある | `docker-compose.yml` の `frontend-dev` とbind mount | 本番用Composeを分離し、開発サーバー、TTY、ソースマウントを本番に含めない。 |
| 高 | ログイン・招待コード・TOTPにレート制限がない | `backend/src/routes/authRoutes.ts` | IP・アカウント単位のレート制限と一時ロックを設ける。 |
| 中 | JWTの既定有効期限が30日で明示的な失効機構がない | `backend/src/utils/auth.ts` | 本番では短命アクセストークン、再認証またはリフレッシュ、失効方針を検討する。 |
| 中 | TOTP暗号鍵がJWT秘密鍵へフォールバックする | `backend/src/utils/totpCrypto.ts` | `TOTP_ENCRYPTION_KEY` を独立した強い秘密値として必須化する。 |
| 中 | 認証より先にアップロード本文をメモリへ受信する | `backend/src/routes/receiptRoutes.ts` | 認証・レート制限を先に適用し、画像形式と実体の検証を強化する。現状は10MBのサイズ上限あり。 |
| 中 | セキュリティヘッダ設定がない | `backend/src/app.ts`、`frontend/nginx.conf` | CSP、HSTS、`X-Content-Type-Options`、`Referrer-Policy`、クリックジャッキング防止を設定する。 |
| 中 | `EXPO_PUBLIC_` 環境変数はクライアントへ露出する | `frontend/.env.example` の `EXPO_PUBLIC_API_TOKEN` | `EXPO_PUBLIC_` には秘密情報を設定しない。 |
| 低 | CORSは環境変数次第 | `backend/src/app.ts`、`backend/.env.example` | 本番の `CORS_ORIGIN` は実際のHTTPSドメインだけに限定する。 |

## 6. 参考情報

- Prisma: https://docs.prisma.io/docs/orm/reference/system-requirements
- Sharp: https://sharp.pixelplumbing.com/install/
- Docker Official Images: https://hub.docker.com/_/node 、https://hub.docker.com/_/postgres 、https://hub.docker.com/_/redis 、https://hub.docker.com/_/nginx
- OCI Network Security: https://docs.oracle.com/en/solutions/oci-security-checklist/network-security1.html
- OWASP REST Security Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html
- OWASP File Upload Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html
