# アーキテクチャ概要（As-built）

Epic: [#276 Issue #90](https://github.com/yama180sx/receipt-ai-app/issues/276) / [#423 Issue #100](https://github.com/yama180sx/receipt-ai-app/issues/423) / [#459 Issue #101](https://github.com/yama180sx/receipt-ai-app/issues/459) / [#468 Issue #102](https://github.com/yama180sx/receipt-ai-app/issues/468) / [#469 Issue #103](https://github.com/yama180sx/receipt-ai-app/issues/469)  
子 Issue: [#292 Issue #90-1](https://github.com/yama180sx/receipt-ai-app/issues/292) / [#439 Issue #100-15](https://github.com/yama180sx/receipt-ai-app/issues/439) / [#461 Issue #101-7](https://github.com/yama180sx/receipt-ai-app/issues/461) / [#474 Issue #102-4](https://github.com/yama180sx/receipt-ai-app/issues/474) / [#473 Issue #102-3](https://github.com/yama180sx/receipt-ai-app/issues/473) / [#480 Issue #103-5](https://github.com/yama180sx/receipt-ai-app/issues/480)  
計画: [plan.md](../refactor/plan.md)（Epic #103 層境界は **§10**）

本ドキュメントは **実装準拠（as-built）** で記述する。コード・テスト済み挙動を正とし、詳細なドメイン・API・画面仕様は後続の設計資料を参照する。

| 資料 | 内容 |
|------|------|
| [database-schema.md](./database-schema.md) | DB 列定義・制約 |
| [domain-model.md](./domain-model.md) | ドメインモデル・業務ルール（#90-2） |
| [api-spec.md](./api-spec.md) | API 仕様・**新 API 追加手順**（#90-3 / #102-4） |
| [openapi.yaml](../openapi/openapi.yaml) | API 契約 SSOT（機械可読、#102） |
| [ai-pipeline.md](./ai-pipeline.md) | 3層正規化・AI パイプライン（#90-4） |
| [frontend-screens.md](./frontend-screens.md) | 画面遷移・フロント（#90-5） |
| [frontend-conventions.md](./frontend-conventions.md) | FE 実装規約・AI プロンプト（#101-7） |
| [settlement-change-guide.md](./settlement-change-guide.md) | 按分・精算ルール変更ガイド（#105-3） |
| [operations.md](./operations.md) | 運用・障害対応（#90-6） |

---

## 1. システム概要

**RecAIpt**（receipt-ai-app）は、世帯単位のレシート管理・AI 解析・月次精算を行う Web / モバイルアプリである。

- **テナント**: `FamilyGroup`（世帯）。招待コードで参加し、データは世帯 ID で分離する。
- **ホスティング**: 自宅サーバー（Dell PowerEdge T320 / Ubuntu）上の Docker Compose。
- **AI**: Google Gemini API によるレシート OCR・構造化。
- **非同期処理**: BullMQ + Redis でレシート画像解析をキューイングする。

---

## 2. コンポーネント図

```mermaid
flowchart TB
    subgraph clients [クライアント]
        Web[Expo Web / Nginx]
        Mobile[Expo Go / Native]
        DevExpo[Expo Dev Server]
    end

    subgraph docker [Docker Compose on T320]
        BE[Backend<br/>Express + Worker]
        PG[(PostgreSQL 18)]
        RD[(Redis 7)]
        FS[uploads/<br/>ローカル FS]
    end

    subgraph external [外部サービス]
        Gemini[Google Gemini API]
        Discord[Discord Webhook]
    end

    Web -->|HTTP /api| BE
    Mobile -->|HTTP /api| BE
    DevExpo -->|HTTP /api| BE

    BE --> PG
    BE --> RD
    BE --> FS
    BE --> Gemini

    Cron[setup-env.sh cron] --> Backup[scripts/backup.sh]
    Backup --> Discord
```

### 2.1 技術スタック（実装ベース）

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

## 3. リポジトリ構成

```
receipt-ai-app/
├── backend/                 # Express API + BullMQ Worker
│   ├── prisma/              # スキーマ・マイグレーション・seed
│   ├── src/
│   │   ├── app.ts           # Express アプリファクトリ（テスト共有可能）
│   │   ├── server.ts        # 起動エントリ + Worker import
│   │   ├── controllers/     # HTTP ハンドラ（Service 呼び出し + Mapper + envelope）
│   │   ├── mappers/         # Prisma / ドメイン → apiSchemas DTO（#103）
│   │   ├── middleware/      # auth, tenant, validate, errorHandler
│   │   ├── routes/          # ルート定義
│   │   ├── services/        # ビジネスロジック（Application 層）
│   │   ├── repositories/    # Prisma 永続化（#100-2 / #98-8）
│   │   ├── types/           # apiSchemas（#102）, receipt ドメイン型, express.d.ts
│   │   ├── utils/           # asyncHandler, sendApiResponse, AppError 等
│   │   ├── queues/          # BullMQ キュー定義
│   │   ├── workers/         # BullMQ Worker
│   │   └── __tests__/integration/  # Supertest 結合テスト（ドメイン別 #100-16）
│   └── uploads/             # レシート画像（ローカル FS）
├── frontend/                # Expo アプリ
│   ├── app/                 # Expo Router ルート（#98-8 Phase 2）
│   └── src/
│       ├── screens/         # 薄型 Screen（UI + Hook 接続）
│       ├── features/        # ドメイン別 Hook / コンポーネント / スタイル
│       ├── api/             # HTTP クライアント（axios ラッパー）
│       ├── mappers/         # API レスポンス → ViewModel（#100-4）
│       ├── components/      # 共有 UI・レイアウト
│       ├── contexts/        # ReceiptTray, DisplayMode
│       ├── services/        # auth, login, biometric（端末永続化）
│       ├── theme/           # screenLayout, cardStyles 等
│       └── utils/           # apiClient, showAlert 等
├── scripts/                 # backup.sh, notify.sh
├── docs/                    # 設計・運用ドキュメント
├── docker-compose.yml
└── setup-env.sh             # dev / stable 環境生成
```

---

## 4. バックエンドレイヤー

### 4.1 `app.ts` と `server.ts` の分離（#91-3）

テスト計画 [#91-3](https://github.com/yama180sx/receipt-ai-app/issues/280) に基づき、起動責務とアプリ定義を分離している。

| ファイル | 責務 |
|----------|------|
| `app.ts` | `createApp()` — Express ミドルウェア・ルート定義のみ。Supertest 結合テストから import 可能 |
| `server.ts` | `dotenv` 読込 → `receiptWorker` import → `createApp()` → `listen()` |

**分離の理由**: 旧来の単一 `server.ts` では Worker 起動が import 時に走り、Redis 未接続環境（Vitest / Supertest）でエラーになる。テスト時は `createApp()` のみを import し、Worker は起動しない。

```typescript
// app.ts — Worker は起動しない
export function createApp() { /* Express 定義 */ }

// server.ts — 本番・開発サーバー起動時のみ Worker を import
import './workers/receiptWorker';
const app = createApp();
app.listen(port, host);
```

### 4.2 ミドルウェアチェーンとエラー経路（#103-4）

```mermaid
flowchart TB
    REQ[HTTP Request] --> CORS[cors]
    CORS --> JSON[express.json]
    JSON --> ROUTE{パス判定}

    ROUTE -->|/health| HEALTH[公開]
    ROUTE -->|/api/auth/*| AUTH[authRoutes]
    ROUTE -->|/api/admin/*| ADM[auth → tenant → isAdmin → adminRoutes]
    ROUTE -->|/api/*| PROT[protectedApi]

    PROT --> A1[authMiddleware]
    A1 --> T1[tenantMiddleware]
    T1 --> CTRL[Controller<br/>asyncHandler]

    CTRL -->|成功| OK[sendSuccess / sendMessage]
    CTRL -->|throw / reject| NEXT[next error]
    NEXT --> EH[errorHandler]
    EH --> ERR_JSON[error envelope JSON]
    OK --> RES[200/201 JSON]
```

| ミドルウェア / ユーティリティ | 役割 |
|------------------------------|------|
| `authMiddleware` | Bearer JWT 検証（`purpose: access`）、`req.user` 設定。認証失敗は **ミドルウェア直返し**（[api-spec.md](./api-spec.md) §2.3） |
| `tenantMiddleware` | `memberId` → DB で `familyGroupId` 取得、`AsyncLocalStorage` にテナントコンテキスト設定 |
| `pendingAuthMiddleware` | TOTP セットアップ・検証用短期トークン（10 分） |
| `validate` | Zod 検証。失敗時は `zodErrorToAppError` → `next(error)` |
| `isAdmin` | `role=ADMIN` かつ `totpEnabled=true`（管理者 API） |
| `asyncHandler` | Controller の未捕捉例外を `next(error)` に委譲（#103-4） |
| `errorHandler` | `AppError` / `ZodError` / `DuplicateReceiptError` / 未知例外の envelope 統一（#98-5 / #103-4） |

**エラー envelope の正本**: [api-spec.md](./api-spec.md) **§2.3**。Controller / Service は `res.status(4xx/5xx).json(...)` を書かず、`throw new AppError(...)` または `next(error)` のみとする。

### 4.3 API ルートマウント（概要）

| マウント | 保護 | 内容 |
|----------|------|------|
| `/api/auth` | 公開（個別ルートで pending JWT） | ログイン・TOTP |
| `/api/admin` | JWT + tenant + ADMIN + TOTP | プロンプト・コスト統計 |
| `/api` | JWT + tenant | レシート・カテゴリ・商品マスタ・精算 |

詳細なエンドポイント一覧は [api-spec.md](./api-spec.md)（#90-3）で記述する。plan.md §8 に抜粋あり。

### 4.4 層境界と責務（#103 as-built）

Epic [#469 #103](https://github.com/yama180sx/receipt-ai-app/issues/469) 完了後の Backend 層構成。目標は **Controller → Service → Repository** の業務経路と、**Service 戻り値 → Mapper → HTTP envelope** の変換経路を分離することである（[plan.md](../refactor/plan.md) §10）。

```mermaid
flowchart TB
  subgraph http [HTTP 層]
    CTRL[Controller]
    MW[Middleware]
    EH[errorHandler]
    SEND[sendSuccess / sendMessage]
  end

  subgraph app [Application 層]
    MAP[Response Mapper]
    SVC[Service]
  end

  subgraph infra [Infrastructure]
    REPO[Repository]
    PRISMA[(Prisma)]
  end

  REQ[Client] --> MW
  MW --> CTRL
  CTRL --> SVC
  SVC --> REPO
  REPO --> PRISMA
  SVC -->|ドメイン / Prisma| MAP
  MAP -->|apiSchemas DTO| SEND
  SEND --> REQ
  CTRL -->|next error| EH
  EH --> REQ
```

| 層 | 配置 | やること | やらないこと |
|----|------|----------|--------------|
| Middleware | `src/middleware/` | JWT / テナント / Zod 検証、認証失敗の即時 401/403 | 業務ルール、Prisma 直叩き（`isAdmin` の role 確認を除く） |
| Controller | `src/controllers/` | `req` から入力抽出、Service 呼び出し、Mapper で DTO 化、`sendSuccess` / `sendMessage` | Prisma 直叩き、複雑な DTO 整形、try/catch 内の独自エラー JSON、`res.status(4xx)` 直書き |
| Response Mapper | `src/mappers/` | Prisma / 集計ドメイン → `apiSchemas` DTO（日付 ISO 化、ネスト整形） | DB アクセス、業務判断、HTTP ステータス決定 |
| Service | `src/services/` | 業務ルール、Repository 編成、トランザクション、JWT 発行（auth） | `req` / `res` 参照、`apiSchemas` 形のレスポンス組み立て |
| Repository | `src/repositories/` | Prisma クエリ、テナントスコープ | HTTP レスポンス生成 |
| errorHandler | `src/middleware/errorHandler.ts` | 全例外の `{ success: false, message, ... }` 統一 | ドメイン固有ロジックの肥大化 |

**読み取り API の典型フロー**: `Controller` → `Service`（Prisma / ドメインを返す）→ `Mapper`（`apiSchemas` DTO）→ `sendSuccess(res, dto)`。

**書き込み API**: 同上。作成系は `sendSuccess(res, dto, 201)`。メッセージのみは `sendMessage`。

#### 4.4.1 Response Mapper 一覧（as-built）

| ファイル | ドメイン | 主な変換 |
|----------|----------|----------|
| `receiptMapper.ts` | receipt / ジョブ | `ReceiptDetail`, `ReceiptJobListItem`, `ReceiptJobStatus`, カテゴリ一覧 |
| `authMapper.ts` | auth | `LoginResponse`, `ResolvedFamily`, `AuthFamilyMember`, `TotpSetupInfo` |
| `adminMapper.ts` | admin | `PromptTemplate`, `AdminCostStatRow` |
| `statsMapper.ts` | 統計 | `MonthlyStatsData`, `AdvancedStatsData` |
| `settlementMapper.ts` | 精算 | `SettlementStatusData`, `SettlementTransfer` |

ユーティリティ: `utils/asyncHandler.ts`（例外委譲）、`utils/sendApiResponse.ts`（成功 envelope）、`utils/zodError.ts`（Zod → `AppError`）。

**FE Mapper との境界**: `frontend/src/mappers/` は **DTO → ViewModel**（表示用正規化）。BE Mapper は **Prisma / ドメイン → DTO** で方向が逆。統計画面は FE `statsMapper.mapMonthlyStatsResponse` が旧 API 互換も吸収する（§6）。

### 4.5 Repository 層（#100-2 / #98-8）

Prisma への直接アクセスは **Repository に集約** する。Service は Repository 経由でのみ DB を操作し、Controller は Prisma を import しない（#100-3 完了時点で Controller 直叩き 0 件）。

| リポジトリ | 主な責務 |
|------------|----------|
| `repositories/receipt/` | レシート・明細・按分の CRUD・検索（read / write / stats に分割） |
| `repositories/categoryRepository.ts` | カテゴリ CRUD・最適化 |
| `repositories/memberRepository.ts` | メンバー・認証関連 |
| `repositories/settlementRepository.ts` | 精算・送金 |
| `repositories/productMasterRepository.ts` | 商品マスタ |
| `repositories/promptRepository.ts` | プロンプトテンプレート |
| `repositories/apiUsageLogRepository.ts` | AI 利用ログ |

テナントスコープは Prisma Client Extension（`$extends`）で Repository 内部から適用する。UseCase 物理層（`usecases/` フォルダ）は設けず、**Service メソッド = Application 操作** とする（[plan.md](../refactor/plan.md) §7）。

### 4.6 API 契約型（OpenAPI SSOT / #102）と Mapper 出力（#103）

Epic [#468 #102](https://github.com/yama180sx/receipt-ai-app/issues/468) に基づき、**公開 API の契約は OpenAPI YAML のみを正本** とする。FE/BE で手動に DTO を二重定義しない。

```mermaid
flowchart LR
  OAS[docs/openapi/openapi.yaml]
  GEN[frontend/api/generated]
  FET[frontend/types ViewModel]
  FEMAP[frontend/mappers]
  APISCH[backend/types/apiSchemas]
  BEMAP[backend/mappers]
  CTRL[backend/controllers]
  SVC[backend/services]
  DOM[backend/types/receipt]

  OAS -->|openapi-typescript| GEN
  GEN --> FET
  GEN --> FEMAP
  OAS -.->|手動同期| APISCH
  SVC --> BEMAP
  BEMAP -->|apiSchemas DTO| CTRL
  APISCH -.->|出力型の正本| BEMAP
  SVC --> DOM
  CTRL --> SVC
```

| 層 | 正本 | 配置 | 備考 |
|----|------|------|------|
| API 契約（DTO） | OpenAPI | `docs/openapi/openapi.yaml` | FE: `generate:api` / BE: `types/apiSchemas.ts`（[plan.md](../refactor/plan.md) §9） |
| FE ViewModel | 画面固有 | `frontend/src/types/` | generated の re-export + 拡張のみ |
| FE Mapper | DTO → 表示用 | `frontend/src/mappers/` | 例: `statsMapper.ts`（#100-4） |
| BE API DTO | OpenAPI 契約ミラー | `backend/src/types/apiSchemas.ts` | `apiSchemas.test.ts` で schema 名を検証（#102-3） |
| BE Response Mapper | Prisma / ドメイン → API DTO | `backend/src/mappers/` | **出力型は `apiSchemas` に一致**（#103-1〜3） |
| BE ドメイン型 | 内部モデル | `backend/src/types/receipt.ts` 等 | `ParsedReceipt` 等。HTTP レスポンスは Mapper 経由で apiSchemas |
| BE Express 拡張 | リクエストコンテキスト | `backend/src/types/express.d.ts` | `req.user` 等 |
| DB | Prisma | `backend/prisma/schema.prisma` | API DTO とは別層 |

**Epic #102 ↔ #103 の関係**: #102 が OpenAPI / `apiSchemas` の **契約正本** を定義し、#103 が Service 戻り値をその契約形に変換する **Mapper 層** を追加する。新規 DTO フィールドは先に `openapi.yaml` → FE `generate:api` → `apiSchemas.ts` の順（[plan.md](../refactor/plan.md) §10.8 チェックリスト）。

**新 API 追加**: [api-spec.md](./api-spec.md) **§9**（チェックリスト・CI コマンド・AI プロンプト）を正本とする。PR では `check:api`（FE generated diff）と `check:openapi`（BE ルート突合）が必須。

---

## 5. リクエストフロー

### 5.1 認証 → テナント → 業務 API（成功経路）

```mermaid
sequenceDiagram
    participant C as Client
    participant MW as Middleware
    participant CTRL as Controller
    participant SVC as Service
    participant MAP as Mapper
    participant DB as PostgreSQL

    C->>MW: GET /api/receipts + Bearer JWT
    MW->>MW: authMiddleware / tenantMiddleware
    MW->>CTRL: requireTenantContext 可能
    CTRL->>SVC: listReceipts(ctx, query)
    SVC->>DB: Repository 経由クエリ
    DB-->>SVC: Prisma models
    SVC-->>CTRL: ドメイン / Prisma
    CTRL->>MAP: mapReceiptList(...)
    MAP-->>CTRL: apiSchemas DTO
    CTRL->>C: sendSuccess 200 JSON
```

### 5.1.1 エラー経路（#103-4）

```mermaid
sequenceDiagram
    participant C as Client
    participant CTRL as Controller
    participant SVC as Service
    participant EH as errorHandler

    C->>CTRL: API リクエスト
    CTRL->>SVC: 業務処理
    SVC-->>CTRL: throw AppError(404)
    Note over CTRL: asyncHandler が catch
    CTRL->>EH: next(error)
    EH->>C: 404 { success: false, message }
```

バリデーション失敗（`validate` ミドルウェア）も同経路で `AppError(400, details)` として `errorHandler` に到達する。重複レシート（`DuplicateReceiptError`）は 409 + `existingId` の専用 envelope（[api-spec.md](./api-spec.md) §2.3）。

### 5.1.2 認証フロー（概要）

```mermaid
sequenceDiagram
    participant C as Client
    participant A as /api/auth
    participant P as protectedApi
    participant DB as PostgreSQL

    C->>A: POST /login (inviteCode, memberId, password)
  Note over A: TOTP 未設定 → totp_setup<br/>TOTP 有効 → totp_pending
    A-->>C: access JWT (purpose: access, 30d)

    C->>P: GET /api/receipts<br/>Authorization: Bearer + x-member-id
    P->>P: authMiddleware (JWT verify)
    P->>DB: memberId → familyGroupId
    P->>P: tenantMiddleware (AsyncLocalStorage)
    P->>DB: 世帯スコープでクエリ
    P-->>C: 200 JSON
```

**認証の要点**

- テナント = `FamilyGroup`。メンバーは招待コードで世帯を解決してログインする。
- 全メンバーに TOTP セットアップが必須（初回ログイン時）。
- 管理者 API は `ADMIN` ロール + TOTP 有効が追加要件。
- フロントエンドは毎リクエストに `Authorization: Bearer` と `x-member-id` を付与する。

### 5.2 レシート解析（非同期）

解析と永続化は **分離** されている（Issue #49-8 / #71）。Worker は解析のみ行い、DB 保存はユーザー確認後の `commit` で行う。

```mermaid
sequenceDiagram
    participant C as Client
    participant API as Backend API
    participant Q as BullMQ
    participant W as receiptWorker
    participant G as Gemini

    C->>API: POST /api/receipts/upload (multipart)
    API->>API: sharp → WebP → uploads/
    API->>Q: enqueue (receipt-analysis)
    API-->>C: 202 jobId

    loop 2秒ポーリング
        C->>API: GET /api/receipts/jobs
    end

    Q->>W: dequeue
    W->>G: analyzeReceiptImage
    G-->>W: ParsedReceipt
    W-->>Q: job.returnvalue

    C->>API: GET /api/receipts/status/:jobId
    API-->>C: 解析結果（未保存）

    C->>API: POST /api/receipts/commit
    API->>API: DB 永続化
```

| 要素 | 設定・挙動 |
|------|------------|
| キュー名 | `receipt-analysis` |
| Worker 起動 | `server.ts` import 時、backend コンテナと同一プロセス |
| concurrency | 5 |
| 完了ジョブ保持 | 30 分（ポーリング用） |
| リトライ | attempts: 3, exponential backoff 5s |

Worker の実装: `backend/src/workers/receiptWorker.ts`  
キュー定義: `backend/src/queues/receiptQueue.ts`

---

## 6. フロントエンド概要

Expo Router（`frontend/app/`）によるファイルベースルーティング。**Screen は UI の薄型ラッパー** とし、API 呼び出し・画面状態は `features/*/hooks` に集約する（#98-8 Phase 2 / #100-7〜#100-14）。

| 区分 | ルート例 | Screen / features |
|------|----------|-------------------|
| 認証 | `/login` | `LoginScreen` → `features/auth` |
| ホーム | `/` | `HomeScreen` → `features/home` |
| レシート | `/history`, `/tray`, `/scan/[jobId]` | `HistoryScreen`, `ReceiptTrayScreen`, `ReceiptScanScreen` → `features/history`, `features/receipt` |
| 精算・統計 | `/settlement`, `/stats`, `/history/[receiptId]/split` | `SettlementSummaryScreen`, `StatisticsScreen`, `SplitEditorScreen` → `features/settlement`, `features/stats` |
| 管理（ADMIN） | `/admin/*` | `AdminMenuScreen` 他 → 各 Screen + `features/category` 等 |
| 設定 | `/settings/totp` | `TotpSettingsScreen` |

**状態管理**: `AppSessionProvider`（`features/app`）+ `ReceiptTrayProvider` + 各 Hook のローカル state。Redux / Zustand は未使用。

**API 接続**: `frontend/src/api/*`（型付きラッパー）→ `apiClient.ts`（認証ヘッダ注入・403 通知）。DTO は [openapi.yaml](../openapi/openapi.yaml) 由来の `api/generated`（[api-spec.md](./api-spec.md) §9）。Screen / Hook から `categoryApi` / `receiptApi` / `statsApi` を直接 import しない（#100-14）。

**Mapper**: API 生レスポンスの画面向け整形は `frontend/src/mappers/`（例: `statsMapper.ts`）。**BE** の `backend/src/mappers/statsMapper.ts` / `settlementMapper.ts` は Prisma・集計ドメイン → OpenAPI DTO への変換であり、FE Mapper とは責務が逆方向（DTO → ViewModel）である。統計画面では FE が `statsMapper.mapMonthlyStatsResponse` で表示用に正規化し、精算画面は API DTO をそのまま利用する箇所が多い（#103-3）。

詳細は [frontend-screens.md](./frontend-screens.md)（#90-5 / #100-15）を参照。

### 6.1 features/ 構成（as-built）

| モジュール | Hook（代表） | 役割 |
|------------|--------------|------|
| `features/app` | `useAppSession`, `useAppNavigation` | セッション・ルーター・シェル |
| `features/auth` | `useLoginFlow` | ログイン step フロー |
| `features/home` | `useHomeDashboard`, `useReceiptUpload` | ダッシュボード・撮影アップロード |
| `features/history` | `useReceiptHistory` | 履歴一覧・フィルタ・カテゴリ更新 |
| `features/receipt` | `useReceiptDetail`, `useReceiptScan` | 詳細編集・解析結果 commit |
| `features/stats` | `useStatistics` | 月次統計・グラフ |
| `features/settlement` | `useSettlementSummary`, `useSplitEditor` | 精算・按分 |
| `features/category` | `useCategoryManagement` | カテゴリ CRUD |
| `features/productMaster` | `useProductMaster` | 学習マスタ |
| `features/admin` | `usePromptEditor`, `useAdminStats` | プロンプト編集・コスト統計 |

**domain/（#104-3）**: `domain/settlement/` に按分保存 payload 構築・明細小計・初期メンバー選定などの純関数を配置。Hook は domain を呼び出す。

**Context 薄型化（#104-3）**: `ReceiptTrayProvider` のロジックは `hooks/useReceiptTrayController.ts`、Context は配布のみ。

各 feature は `hooks/`, `components/`, `styles/`（任意）, `index.ts`（バレル）で構成する。

### 6.2 レイヤールール（AI プロンプト転用用）

詳細・行数上限・プロンプトテンプレートは **[frontend-conventions.md](./frontend-conventions.md)**（#101-7）を正本とする。以下は層の要約（[plan.md](../refactor/plan.md) Epic #100 / #101 方針）。

| 層 | 場所 | 許可 | 禁止 |
|----|------|------|------|
| Presentation | `screens/`, `features/*/components` | JSX・スタイル・Hook 呼び出し | `prisma` / `categoryApi` 等の直 import（Screen） |
| Application | `features/*/hooks`, `services/` | 複数 API の編成・UI 向け state | Prisma 直叩き（FE） |
| Domain（FE） | `src/domain/<area>/` | 按分計算・端数ルール等の純関数（#104-3） | React import、API 呼び出し、副作用 |
| API Client | `src/api/*`, `apiClient.ts` | HTTP・認証ヘッダ | ビジネスロジック |
| Mapper（FE） | `src/mappers/*` | DTO → ViewModel 変換 | API 呼び出し |
| Controller（BE） | `backend/controllers` | Service 呼び出し + Mapper + `sendSuccess` | Prisma 直叩き、DTO 整形の複雑ロジック |
| Mapper（BE） | `backend/mappers` | Prisma / ドメイン → `apiSchemas` | DB アクセス、HTTP ステータス |
| Service（BE） | `backend/services` | Repository 経由の業務ロジック | `req` / `res` 参照 |
| Repository（BE） | `backend/repositories` | Prisma クエリ | HTTP レスポンス生成 |
| errorHandler（BE） | `backend/middleware/errorHandler.ts` | 例外 envelope 統一 | 業務ロジック |

**粒度ルール**

1. **1 エンドポイント = 1 Service メソッド**（Controller は薄く保つ）
2. **1 画面の主要操作 = 1 Hook**（fetch・保存・フィルタ変更などを Screen 内に直書きしない）
3. **ユーザー通知**は `showAlert` / `showConfirmDialog` に統一（Web 対応 #100-13）

### 6.3 FE データフロー（DTO / ViewModel / Mapper / domain）— #105-4

全スタックの型境界（OpenAPI SSOT・BE Mapper）は **§4.6** を正本とする。本節は **Frontend 内** で DTO が Hook / UI に届くまでの読み取り経路を 1 枚で示す。

```mermaid
flowchart TB
  subgraph contract [契約 SSOT — Epic #102]
    OAS["docs/openapi/openapi.yaml"]
    GEN["frontend/src/api/generated"]
    OAS -->|"npm run generate:api"| GEN
  end

  subgraph apiLayer [API Client 層]
    API["frontend/src/api/*Api.ts"]
    CLIENT["frontend/src/utils/apiClient.ts"]
    GEN --> API
    API --> CLIENT
  end

  subgraph transform [変換・型の整理]
    TYPES["frontend/src/types/"]
    MAP["frontend/src/mappers/"]
    GEN --> TYPES
    GEN --> MAP
    MAP --> TYPES
  end

  subgraph app [Application / Presentation]
    HOOK["features/*/hooks/useXxx.ts"]
    DOMAIN["frontend/src/domain/<area>/"]
    UI["screens/ + features/*/components/"]
    HOOK --> UI
    DOMAIN --> HOOK
  end

  CLIENT -->|"HTTP GET/POST"| BE["Backend API"]
  HOOK --> API
  HOOK --> MAP
  HOOK --> TYPES
```

| 層 | 配置 | 責務 | 禁止 |
|----|------|------|------|
| DTO（契約型） | `api/generated` | OpenAPI から自動生成。Hook / Mapper の **入力型** | 手動編集、画面 state への直代入のみ |
| `*Api.ts` | `api/statsApi.ts` 等 | `apiClient` 経由の HTTP。戻り値は `ApiSuccessResponse<GeneratedDto>` | ビジネスロジック、DTO 手書き定義 |
| ViewModel | `types/` | generated の **re-export** + 画面固有型（編集中 state 等） | API レスポンスの手動二重定義 |
| Mapper | `mappers/` | DTO → ViewModel（正規化・旧 API 互換・表示用集計） | API 呼び出し |
| domain | `domain/<area>/` | 業務ルール **純関数**（按分計算・payload 生成等） | React import、API 呼び出し、副作用 |
| Hook | `features/*/hooks/` | API 編成・Mapper 呼び出し・UI state | Screen 内へのロジック直書き |
| UI | `screens/`, `components/` | 表示・イベントを Hook に委譲 | `*Api` / `apiClient` の直 import |

**`domain/` の位置**: DTO / ViewModel とは別軸。HTTP レスポンスを変換するのではなく、**保存前の業務計算**（例: 明細小計、按分 payload 末尾配置）を Hook から呼ぶ。詳細は [settlement-change-guide.md](./settlement-change-guide.md)。

#### 6.3.1 手書き `*Api.ts` の位置づけ

`statsApi.ts` / `receiptApi.ts` 等は **generated 型を使う薄いラッパー** である。`categoryApi.ts` は **#105-5 PoC として openapi-fetch 移行済み**（`openapiClient` + generated paths）。その他は従来どおり axios `apiClient`。

```typescript
// statsApi.ts — 典型パターン
async getSettlementStatus(month: string): Promise<ApiSuccessResponse<SettlementStatusData>> {
  const res = await apiClient.get('/stats/settlement', { params: { month } });
  return res.data; // envelope ごと DTO 型
}
```

| 役割 | 内容 |
|------|------|
| 型 | 引数・戻り値は `api/generated` の DTO / `ApiSuccessResponse<T>` |
| 認証 | `apiClient` が JWT ヘッダ注入・403 通知を担当 |
| 将来 | Epic #105-5 で OpenAPI 由来の generated HTTP client へ段階移行可能（`*Api.ts` を adapter 化） |

Hook は `features/*/index.ts` 経由で Screen から使う。**Screen から `*Api` を直接 import しない**（#100-14）。

#### 6.3.2 具体例 A — 統計画面（Mapper 経由）

DTO と画面表示 shape が一致しない、または旧 API 互換が必要な場合に Mapper を挟む。

```mermaid
sequenceDiagram
  participant UI as StatisticsScreen
  participant Hook as useStatistics
  participant API as statsApi
  participant MAP as statsMapper
  participant VM as types/stats

  UI->>Hook: 月選択
  Hook->>API: getMonthlyStats(month)
  API-->>Hook: ApiSuccessResponse MonthlyStatsData
  Hook->>MAP: mapMonthlyStatsResponse(data, month)
  MAP-->>Hook: MonthlyStatsViewModel
  Hook->>VM: setState(ViewModel)
  Hook-->>UI: data, chartSlices, ...
```

| 段階 | ファイル | 型 |
|------|----------|-----|
| HTTP | `statsApi.getMonthlyStats` | `MonthlyStatsData`（generated DTO） |
| 変換 | `mappers/statsMapper.mapMonthlyStatsResponse` | `MonthlyStatsViewModel` |
| 表示 | `features/stats/components/*` | ViewModel を props / Hook 戻り値で受け取る |

旧 API の `total` フィールド等の互換吸収は **Mapper に閉じ込める**（Hook に散らさない）。

#### 6.3.3 具体例 B — 精算サマリー（DTO 直利用）

DTO shape がそのまま UI に使える場合、Mapper を省略してよい（[frontend-conventions.md](./frontend-conventions.md) §4.3）。

```mermaid
sequenceDiagram
  participant UI as SettlementSummaryScreen
  participant Hook as useSettlementSummary
  participant API as statsApi
  participant T as types/settlement

  UI->>Hook: 月選択 / 送金登録
  Hook->>API: getSettlementStatus(month)
  API-->>Hook: SettlementStatusData
  Hook->>T: members / transfers を state に格納
  Note over Hook,T: types/settlement は generated の re-export
  Hook-->>UI: summaryData, transferList
```

| 段階 | ファイル | 型 |
|------|----------|-----|
| HTTP | `statsApi.getSettlementStatus` | `SettlementStatusData` |
| 型整理 | `types/settlement.ts` | `SettlementMemberSummary` 等 = generated re-export |
| 表示 | `SettlementMemberCards` 等 | DTO と同一 shape をそのまま描画 |

按分編集（`useSplitEditor`）は API DTO に加え **`domain/settlement/`**（`calcItemTotal`, `buildItemSplitSavePayload`）を Hook から呼ぶパターン。DTO 変換ではなく **保存前の業務ルール** が domain の責務。

#### 6.3.4 §4.6 型境界図との関係

| 資料 | スコープ |
|------|----------|
| **§4.6** | OpenAPI → FE generated / BE `apiSchemas` → BE Mapper → Controller の **契約・型正本** |
| **§6.3（本節）** | FE 内の **実行時データフロー**（`*Api` → Mapper? → Hook → UI、`domain/` の横断） |

両者は矛盾しない。§4.6 が「何を正本とするか」、§6.3 が「初見開発者がコードを辿る順序」を示す。

---

## 7. データストア

### 7.1 PostgreSQL（Prisma）

世帯（`FamilyGroup`）を最上位テナントとし、レシート・カテゴリ・店舗マスタ等は `familyGroupId` で分離する。

| モデル | 役割 |
|--------|------|
| `FamilyGroup` / `FamilyMember` | 世帯・メンバー・権限・TOTP |
| `Receipt` / `Item` / `ItemSplit` | レシート本体・明細・按分 |
| `Category` / `Store` / `ProductMaster` | 世帯別マスタ・学習データ |
| `SettlementTransfer` | 月次精算の送金記録 |
| `PromptTemplate` / `ApiUsageLog` | AI プロンプト・トークン使用量 |

ER 詳細は [domain-model.md](./domain-model.md)（#90-2）。

### 7.2 画像ストレージ

クラウドストレージは未使用。`backend/uploads/` に WebP 変換後の画像を保存し、認証付き `GET /api/uploads/:filename` で配信する（世帯スコープ検証あり）。

### 7.3 Redis

BullMQ のジョブキュー専用。`redisdata/` ボリュームで永続化。

---

## 8. 環境とデプロイ

### 8.1 dev / stable 二重環境

`setup-env.sh [dev|stable]` で同一 T320 上に独立した Compose プロジェクトを起動する。

| 項目 | dev | stable |
|------|-----|--------|
| `ENV_NAME` | dev | stable |
| `NODE_ENV` | development | production |
| Backend ポート | 3001 | 3000 |
| Web ポート | 8080 | 80 |
| Expo Dev ポート | 8081 | 8082 |
| DB ポート | 5433 | 5432 |
| Redis ポート | 6380 | 6379 |
| Backend コマンド | `npm run dev` | `npm run start` |
| バックアップ cron | 毎日 3:00 | 毎日 4:00 |

秘密情報（`JWT_SECRET`, `GEMINI_API_KEY`, `DB_PASS` 等）は `.env.secret`（git 管理外）から読み込む。

### 8.2 Docker Compose サービス

| サービス | 役割 |
|----------|------|
| `backend` | Express API + BullMQ Worker |
| `frontend` | Nginx + Expo Web 静的ビルド |
| `frontend-dev` | Expo 開発サーバー |
| `db` | PostgreSQL 18 |
| `redis` | Redis 7 |

### 8.3 CI/CD

**テスト（`test.yml`）** — PR to `develop`:

1. Backend unit（Vitest）
2. Frontend unit（Vitest）
3. Backend integration（Postgres service + `prisma migrate deploy` + seed）— `src/__tests__/integration/*.integration.test.ts`（#100-16、直列実行）

`createApp()` 分離により、結合テストは Worker なしで Supertest 実行可能。

**デプロイ（`deploy.yml`）** — push to `main`:

1. self-hosted runner（`t320`）で checkout
2. `rsync` → `~/stable/receipt-ai-app/`（`pgdata`, `uploads` 等は除外）
3. GitHub Secrets / Vars から `.env` 生成
4. `prisma migrate deploy`
5. `docker compose up -d --build`

運用詳細（バックアップ・Discord 通知・リストア・DB マスタ運用）は [operations.md](./operations.md)（#90-6）を参照。コマンド全文は [db-operations.md](../db-operations.md), [restore-manual.md](../restore-manual.md) にも維持。

---

## 9. 外部連携

| 連携先 | 用途 | 実装 |
|--------|------|------|
| Google Gemini | レシート画像解析 | `backend/src/services/geminiService.ts` |
| Discord Webhook | バックアップ失敗・障害通知 | `scripts/backup.sh`, `scripts/notify.sh` |

Gemini のプロンプトは DB の `PromptTemplate`（key=`RECEIPT_ANALYSIS`）から動的取得する。3層正規化の詳細は [ai-pipeline.md](./ai-pipeline.md)（#90-4）。

---

## 10. セキュリティ要点

- **マルチテナンシー**: JWT の `familyGroupId` と DB 照合 + `AsyncLocalStorage` でサービス層のクエリを世帯スコープに限定。
- **TOTP**: 全メンバー必須。シークレットは AES-256-GCM で暗号化保存。
- **画像アクセス**: 公開静的配信は廃止。認証 + 世帯検証付き API 経由のみ。
- **CORS**: `CORS_ORIGIN` で dev / stable / Expo Go（`exp://`）を環境ごとに許可。

---

## 11. 関連資料

- [plan.md](../refactor/plan.md) — Epic #90 / #100 / #101 / #102 / **#103** 全体計画（BE 層境界は §10）
- [docs/testing/plan.md](../testing/plan.md) — テスト計画（#91）
- [docs/reviews/issue-87/README.md](../reviews/issue-87/README.md) — 精算ドメイン詳細
- [docs/MILESTONE_PHASE1.md](../MILESTONE_PHASE1.md) — 3層正規化の起源
