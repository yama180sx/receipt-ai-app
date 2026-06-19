# RecAIpt（receipt-ai-app）

世帯単位のレシート管理・AI 解析・月次精算を行う Web / モバイルアプリです。  
自宅サーバー（Dell PowerEdge T320 / Ubuntu）上の Docker Compose で **dev** / **stable** の二重環境を運用しています。

設計資料の全体計画: [docs/design/plan.md](docs/design/plan.md)（Issue #90）

---

## 概要

- **テナント**: `FamilyGroup`（世帯）。招待コードで参加し、データは世帯 ID で分離
- **AI**: Google Gemini API によるレシート OCR・構造化
- **非同期処理**: BullMQ + Redis でレシート画像解析をキューイング
- **画像**: `backend/uploads/` に WebP 変換後のファイルを保存（クラウドストレージは未使用）

---

## 技術スタック

| レイヤー | 技術 |
|----------|------|
| Frontend | Expo ~54, React 19, React Native 0.81, TypeScript, Axios |
| Backend | Node.js 20, Express 5, TypeScript, Prisma 6 |
| DB | PostgreSQL 18 |
| Queue | BullMQ 5 + Redis 7 |
| AI | `@google/generative-ai`（Gemini） |
| 画像 | sharp（WebP 変換）, multer（アップロード） |
| 認証 | JWT, bcrypt, otplib（TOTP）, AES-256-GCM |
| コンテナ | Docker Compose |
| CI | GitHub Actions（`test.yml` / `deploy.yml`） |

---

## 主な機能

- **AI レシート解析**: レシート画像から品目・金額・日付を Gemini で抽出
- **世帯別管理**: 複数世帯の経費を分離して管理
- **按分・精算**: 明細単位の按分と月次精算サマリー
- **マスタ学習**: 店舗・商品マスタの AI 学習データ管理

---

## 開発環境の構築

### 前提

- Docker / Docker Compose
- Node.js 20（ローカルでテストを走らせる場合）
- Git

### 1. リポジトリのクローン

```bash
git clone https://github.com/yama180sx/receipt-ai-app.git
cd receipt-ai-app
```

### 2. 秘密情報の設定（`.env.secret`）

リポジトリルートに `.env.secret` を作成します（**git 管理外**）。`setup-env.sh` がこのファイルを読み込み、各 `.env` を生成します。

```bash
# .env.secret の例（値は各自で設定）
DB_PASS=your-db-password
JWT_SECRET=your-jwt-secret
GEMINI_API_KEY=your-gemini-api-key
API_TOKEN=your-api-token
```

### 3. 環境ファイルの生成

```bash
./setup-env.sh dev    # 開発環境（stable の場合は stable）
```

`setup-env.sh` が行うこと:

1. `.env.secret` から秘密情報を読み込み
2. ルート / `frontend` / `backend` の `.env` を環境別に生成
3. バックアップ用 cron の登録（`scripts/backup.sh`）
4. `logs/` ディレクトリの作成

| 項目 | dev | stable |
|------|-----|--------|
| Backend ポート | 3001 | 3000 |
| Web ポート | 8080 | 80 |
| Expo Dev ポート | 8081 | 8082 |
| DB ポート | 5433 | 5432 |
| Redis ポート | 6380 | 6379 |

ポート・CORS 等の詳細は [docs/design/architecture.md §8.1](docs/design/architecture.md) を参照。

### 4. コンテナの起動

```bash
docker compose up -d --build
```

### 5. データベースの初期化（初回のみ）

```bash
docker compose exec backend npx prisma migrate deploy
docker compose exec backend npm run prisma:seed
```

> `prisma:seed` は**全データを削除して再投入**します。開発環境の初回構築・リセット時のみ実行してください。詳細は [docs/design/operations.md §4](docs/design/operations.md) を参照。

### 6. アクセス

| 用途 | dev の例 |
|------|----------|
| Web UI | `http://<HOST_IP>:8080` |
| Expo Dev | `http://<HOST_IP>:8081` |
| Backend API | `http://<HOST_IP>:3001/api` |

`HOST_IP` は `setup-env.sh` 内の設定（デフォルト `192.168.1.32`）に従います。

### テスト用アセット（任意）

プライバシー保護のため、サンプル画像は Git 管理対象外です。必要に応じてプロジェクトルートに `test-assets/` を作成してください。

---

## テスト

### ローカル実行

```bash
# Backend 単体テスト（Vitest）
cd backend && npm ci && npx prisma generate && npm test

# Frontend 単体テスト（Vitest）
cd frontend && npm ci && npm test

# Backend API 結合テスト（Postgres が必要）
cd backend
export DATABASE_URL="postgresql://cntadm:<password>@localhost:5433/receipt_db?schema=public"
export JWT_SECRET="test-jwt-secret"
npm run test:integration
```

### CI（GitHub Actions）

`develop` への PR で [`.github/workflows/test.yml`](.github/workflows/test.yml) が実行されます。

1. Backend unit（Vitest）
2. Frontend unit（Vitest）
3. Backend integration（Postgres service + `prisma migrate deploy` + seed）

テスト戦略の詳細: [docs/testing/plan.md](docs/testing/plan.md)（Issue #91）

---

## ドキュメント

### 設計資料（Issue #90）

| 資料 | 内容 |
|------|------|
| [docs/design/plan.md](docs/design/plan.md) | 設計資料全体の計画 |
| [docs/design/architecture.md](docs/design/architecture.md) | アーキテクチャ概要 |
| [docs/design/database-schema.md](docs/design/database-schema.md) | DB 列定義・制約 |
| [docs/design/domain-model.md](docs/design/domain-model.md) | ドメインモデル・業務ルール |
| [docs/design/api-spec.md](docs/design/api-spec.md) | API 仕様 |
| [docs/design/ai-pipeline.md](docs/design/ai-pipeline.md) | 3層正規化・AI パイプライン |
| [docs/design/frontend-screens.md](docs/design/frontend-screens.md) | 画面遷移・フロント |
| [docs/design/operations.md](docs/design/operations.md) | 運用・障害対応 |

索引: [docs/design/README.md](docs/design/README.md)

### テスト・運用

| 資料 | 内容 |
|------|------|
| [docs/testing/plan.md](docs/testing/plan.md) | テスト戦略（Issue #91） |
| [docs/db-operations.md](docs/db-operations.md) | DB マスタ運用の詳細手順 |
| [docs/restore-manual.md](docs/restore-manual.md) | バックアップ・リストア手順 |
| [docs/reviews/issue-87/README.md](docs/reviews/issue-87/README.md) | 精算ドメイン詳細レビュー |
| [docs/specs/comparison-chatgpt-vs-design.md](docs/specs/comparison-chatgpt-vs-design.md) | ChatGPT 仕様との突合記録 |

---

## 運用・保守

| 項目 | 内容 |
|------|------|
| バックアップ | `scripts/backup.sh {dev\|stable}` — DB（`.sql.gz`）と画像（`.tar.gz`）を 7 日分ローテーション |
| 監視 | Discord Webhook によるバックアップ失敗・障害通知 |
| デプロイ | `main` push → self-hosted runner で stable へ rsync + migrate + compose up |

運用の詳細: [docs/design/operations.md](docs/design/operations.md)

---

## リポジトリ構成

```
receipt-ai-app/
├── backend/          # Express API + BullMQ Worker
├── frontend/         # Expo アプリ
├── scripts/          # backup.sh, notify.sh
├── docs/             # 設計・運用ドキュメント
├── docker-compose.yml
└── setup-env.sh      # dev / stable 環境生成
```

詳細: [docs/design/architecture.md §3](docs/design/architecture.md)
