# ChatGPT 仕様（Phase1–5）vs `docs/design/` 差分表

作成日: 2026-06-18  
ChatGPT 正本: [`docs/specs/chatgpt/`](./chatgpt/)（ZIP 解析出力）  
プロジェクト正本: [`docs/design/`](../design/)（Issue #90, as-built + テスト反映）

## 凡例

| 判定 | 意味 |
|------|------|
| ✅ 一致 | 実装と両資料が整合（粒度差のみ） |
| △ 部分一致 | 大枠は同じだが欠落・曖昧さあり |
| ❌ 相違 | 誤記または実装と矛盾 |
| C のみ | ChatGPT のみ記載（設計資料に薄い） |
| D のみ | `docs/design/` のみ記載（ChatGPT 未記載 or 【未確認】） |

---

## 0. 資料対応マップ

| ChatGPT Phase | 成果物（ChatGPT） | 対応する `docs/design/` |
|---------------|-------------------|-------------------------|
| Phase1 | `03-database-spec.md`, `04-er-diagram.md` | `domain-model.md` §2–3 + `schema.prisma` |
| Phase2 | `05-api-spec.md`, `06-auth-spec.md` | `api-spec.md` |
| Phase3 | `07-business-rules.md`, `08-settlement-rules.md`, `09-ai-analysis-rules.md` | `domain-model.md` §4–6 + `ai-pipeline.md` |
| Phase4 | 画面ごと仕様 | `frontend-screens.md` |
| Phase5 | `01-project-survey.md`, `02-architecture.md`, `glossary.md` | `architecture.md` + `operations.md` + `README.md` |

---

## Phase1 — DB 仕様

| # | 項目 | ChatGPT | `docs/design/` | 判定 |
|---|------|---------|----------------|------|
| 1.1 | テーブル一覧（12モデル） | FamilyGroup〜PromptTemplate 全件 | `domain-model.md` ER + `schema.prisma` | ✅ |
| 1.2 | Enum `Role` | ADMIN, USER | 同左 | ✅ |
| 1.3 | カラム型・Nullable・Default | 全カラム表形式で記載 | ER 図 + 主要制約のみ（列定義は schema 参照） | △ |
| 1.4 | FK / Unique / Index | テーブルごとに記載 | 主要制約のみ | △ |
| 1.5 | `onDelete: Cascade`（Item, ItemSplit） | 記載あり | `domain-model.md` 間接参照 | ✅ |
| 1.6 | migration 履歴 | 19件列挙 | 未記載（schema 正本） | C のみ |
| 1.7 | 物理 DDL 名 | 【未確認】と明記 | 未記載 | C のみ |
| 1.9 | ドメイン意味（立替/負担/精算） | なし | `domain-model.md` §1 | D のみ → **database-schema からリンク** |
| 1.10 | ItemSplit 0件の意味 | なし | 暗黙デフォルト＝支払者全額負担 | D のみ → **`database-schema.md` §ItemSplit に追記** |

**Phase1 小計:** スキーマ構造は **ほぼ完全一致**。ChatGPT は列レベルが詳細、`docs/design/` は業務意味・ルールが厚い。

---

## Phase2 — API 仕様

| # | 項目 | ChatGPT | `docs/design/` | 判定 |
|---|------|---------|----------------|------|
| 2.1 | エンドポイント網羅 | routes から ~40 件 | 全40件 + マウントパス | △ |
| 2.2 | `GET /health` | **未記載** | 記載（envelope なし） | D のみ |
| 2.3 | ベースパス | 個別パスのみ | `/api/auth`, `/api/admin`, `/api` 等を明示 | △ |
| 2.4 | `POST /receipts/upload` | jobId, queued | **202** + jobs フロー連携 | △ |
| 2.5 | ジョブ API | jobs / status / DELETE 列挙 | §6 非同期フロー詳細 | ✅ |
| 2.6 | 認証フロー | login → TOTP → token | シーケンス図 + pending JWT 3種 | ✅ |
| 2.7 | JWT 有効期限 | 【未確認】 | access 30日、pending 10分 | D のみ |
| 2.8 | Role `USER` | 【未確認】 | ADMIN / USER 明記 | ❌（ChatGPT 未確認だが schema に存在） |
| 2.9 | エラー envelope | 一部 HTTP コードのみ | `success`/`message`/`details`/`code` 体系 | D のみ |
| 2.10 | Admin API エラー | 未記載 | 一部 `{ error }` キー（`message` ではない） | D のみ |
| 2.11 | 重複 409 | DUPLICATE 言及 | `{ message: "DUPLICATE", existingId }` | △ |
| 2.12 | テナント 404 | 未記載 | 他世帯 ID は存在秘匿で 404 | D のみ |
| 2.13 | Request/Response 詳細 | 多くが【未確認】 | 代表例を JSON で記載 | D のみ |
| 2.14 | 画像配信 | GET /uploads/:filename | 認証 + 世帯検証、バイナリ返却 | △ |

**Phase2 小計:** ルート一覧は **概ね一致**。ChatGPT は静的解析のため **レスポンス詳細・例外・ヘルスチェックが薄い**。

---

## Phase3 — 業務ルール

| # | 項目 | ChatGPT | `docs/design/` | 判定 |
|---|------|---------|----------------|------|
| 3.1 | `itemLineTotal` | `Math.round(price * quantity)` | 同左 + FE/BE 一致 + テスト参照 | ✅ |
| 3.2 | `allocateItemSplits` 端数 | 最後のメンバーに残額 | 同左 + 具体例 + T-ref-01 | ✅ |
| 3.3 | カテゴリ推定順 | 店舗付き PM → 名前のみ PM → keywords → その他 | `estimateCategoryId` と同順 | ✅ |
| 3.4 | 重複判定 | imagePath / 店舗・日付・金額 | `duplicateReceiptService` と整合 | ✅ |
| 3.5 | `saveParsedReceipt` フロー | 正規化→重複→作成 | 同左 + commit 分離の文脈 | ✅ |
| 3.6 | **精算集計** | **【解析不可】**（statsController 未解析） | `getSettlementStatus` 完全記述 | ❌ |
| 3.7 | ItemSplit 0件ルール | **未記載** | 暗黙デフォルト（§4.2） | D のみ |
| 3.8 | 家計統計 vs 精算 | **未記載** | §6 で明確分離 | D のみ |
| 3.9 | FE 按分 payload 順序 | **未記載** | 先頭→末尾並べ替え（§4.4） | D のみ |
| 3.10 | `analyzeOnly` vs `commit` | 解析・保存を個別記述 | 責務分離を中核設計として明記 | △ |
| 3.11 | Store 正規化タイミング | commit 時（save 内） | **commit 時のみ**（解析中は生出力） | ✅ |
| 3.12 | Gemini モデル default | `gemini-2.0-flash` | 同左（`GEMINI_MODEL` env） | ✅ |
| 3.13 | 算術整合リトライ | 1円許容 + 自己修復 | `ai-pipeline.md` §詳細 | ✅ |
| 3.14 | TOTP 全員必須 | `isTotpRequiredForRole` → true | 同左 | ✅ |
| 3.15 | BullMQ Worker | 【他レイヤ参照が必要】 | `ai-pipeline.md` シーケンス図 | D のみ |
| 3.16 | ApiUsageLog / PromptTemplate | 【未確認】（Phase1 未連携） | Phase1 + `ai-pipeline.md` で記載 | △ |

**Phase3 小計:** レシート登録・按分・AI 解析は **高精度で一致**。**精算ドメインが ChatGPT 最大の欠落**。

---

## Phase4 — 画面仕様

| # | 項目 | ChatGPT | `docs/design/` | 判定 |
|---|------|---------|----------------|------|
| 4.1 | Screen 一覧（14画面） | 一致 | ViewType 13 + 認証ゲート 3 | ✅ |
| 4.2 | Home → 遷移先 | History, Stats, **CategoryMgr, ProductMaster, PromptEditor, ReceiptScan**, Admin, Tray | History, Stats, Tray, **Settlement(wide)**, **Admin(ADMIN)** のみ | ❌ |
| 4.3 | ReceiptScan 導線 | Home 直遷移と記載 | **Tray 経由**（解析完了後） | ❌ |
| 4.4 | Category API | **PUT** `/categories` | **PUT なし**（GET/POST/DELETE/optimize） | ❌ |
| 4.5 | ProductMaster API | **POST, PUT** | **PATCH** のみ（POST 作成なし） | ❌ |
| 4.6 | PromptEditor API | **PUT** `/admin/prompts/{id}` | **PATCH** | ❌ |
| 4.7 | StatisticsScreen 遷移 | 【未確認】 | 同一画面内詳細パネル/モーダル | D のみ |
| 4.8 | Settlement 表示条件 | 未記載 | **wide 600px+ のみ**ホームから表示 | D のみ |
| 4.9 | `totp_settings` | 通常画面として記載 | ViewType のみ・**UI 導線なし** | D のみ |
| 4.10 | ReceiptTray API | 【未確認】 | jobs / status / DELETE 明記 | D のみ |
| 4.11 | DisplayModeContext | 未記載 | Web 表示モード切替 | D のみ |
| 4.12 | ADMIN 権限ゲート | AdminMenu のみ暗黙 | UI 表示 + **API 403 が実制限** | D のみ |
| 4.13 | ナビ方式 | 画面個別に遷移列挙 | `currentView` ステート（React Navigation 未使用） | △ |

**Phase4 小計:** 画面リストは一致。**Home 遷移と HTTP メソッドに誤りあり**。

---

## Phase5 — アーキテクチャ

| # | 項目 | ChatGPT | `docs/design/` | 判定 |
|---|------|---------|----------------|------|
| 5.1 | 技術スタック | Express 5, Prisma, PG, BullMQ, Redis, Expo 54 | 同左 + バージョン表 | ✅ |
| 5.2 | レイヤー構成 | Controller→Service→Prisma | 同左 + `app.ts`/`server.ts` 分離 | △ |
| 5.3 | **レシートデータフロー** | Worker → Gemini → **Receipt/Item 保存** | Worker → `analyzeOnly`（**DB 書込なし**）→ ユーザー確認 → **commit** | ❌ |
| 5.4 | README 技術記載 | Gemini 1.5 Pro/Flash（ZIP 内 README） | 現行 as-built（Gemini env 変数） | ❌（ZIP 時点 README が古い） |
| 5.5 | dev / stable 二重環境 | **未記載** | `architecture.md` §8, `operations.md` | D のみ |
| 5.6 | CI/CD | **未記載** | `test.yml` / `deploy.yml` | D のみ |
| 5.7 | バックアップ・Discord | **未記載** | `operations.md`, `README.md` | D のみ |
| 5.8 | `setup-env.sh` | **未記載** | 環境生成・cron 登録 | D のみ |
| 5.9 | glossary | 用語表あり | 各資料に分散 | C のみ |
| 5.10 | 外部サービス設定 | すべて【未確認】 | 変数名レベルで記載（値は git 外） | △ |

**Phase5 小計:** コンポーネント構成は一致。**非同期フローの誤解釈**と**運用・CI の欠落**が顕著。

---

## 横断 — 重大差分サマリー

| 優先度 | 差分 | 正本 | 統合後 |
|--------|------|------|--------|
| ~~🔴~~ ✅ | 精算ロジック（totalPaid/totalOwed/balance） | `domain-model.md` §5 | 正本に記載済み（ChatGPT は【解析不可】） |
| ~~🔴~~ ✅ | upload→Worker は DB 保存しない（commit まで） | `ai-pipeline.md` §3 | 正本に記載済み（ChatGPT Phase5 は誤記） |
| ~~🔴~~ ✅ | Home から管理画面・Scan へ直接遷移しない | `frontend-screens.md` §2.2 | 正本に記載済み（ChatGPT Phase4 は誤記） |
| 🟠 中 | Category/ProductMaster/Prompt の HTTP メソッド | `api-spec.md` §4 | ChatGPT に PUT/POST 誤記 — **正本を参照** |
| ~~🟠~~ ✅ | ItemSplit 0件＝暗黙按分 | `domain-model.md` §4.2 | 正本 + `database-schema.md` に記載 |
| ~~🟠~~ ✅ | 家計統計と精算の分離 | `domain-model.md` §6 | 正本に記載済み |
| 🟡 低 | JWT 30日、/health、エラー envelope 詳細 | `api-spec.md` §2 | 正本に記載済み |
| ~~🟡~~ ✅ | dev/stable・バックアップ・CI | `operations.md`, `README.md` | 正本に記載済み |

---

## 統計（概算）

| Phase | ✅ | △ | ❌ | D のみ |
|-------|----|----|-----|--------|
| Phase1 DB | 5 | 2 | 0 | 0（`database-schema.md` 追加） |
| Phase2 API | 3 | 5 | 1 | 6 |
| Phase3 業務 | 8 | 3 | 1 | 5 |
| Phase4 画面 | 1 | 1 | 4 | 7 |
| Phase5 アーキ | 1 | 2 | 2 | 5 |

※ 行ごとの厳密カウントではなく、レビュー観点の概算。

---

## 完成版仕様書への統合方針（推奨）

### 1. 正本（Single Source of Truth）の決定

```
正本レイヤー:
  コード（schema.prisma, routes, services） 
    ↑ 突合
  docs/design/（as-built + テスト findings）
    ↑ 補完・監査
  docs/specs/chatgpt/（ZIP 解析・列挙の監査ログ）
```

- **完成版の正本は `docs/design/` をベース**にする（テスト・Issue 履歴と連携済み）。
- ChatGPT 出力は **「独立した監査ログ」** として `docs/specs/chatgpt/` に保管し、削除しない。

### 2. 統合手順（4ステップ）

```
Step A: 取り込み（ChatGPT → design へ「追加」しない）
Step B: 突合（本差分表の 🔴🟠 をコードで再確認）
Step C: 正本更新（design のみ修正。ChatGPT 原文は不変）
Step D: 索引化（完成版 README / plan から一本化導線）
```

| Step | 作業 | 成果物 |
|------|------|--------|
| A | ChatGPT Phase1 の列定義表を `domain-model.md` 付録または `database-schema.md` として**新規追加**（任意） | 列レベルリファレンス |
| B | 🔴3件をコード確認済みにする | 差分表の判定を ✅ に更新 |
| C | `docs/design/` に不足があれば追記のみ | PR（例: `docs: 仕様統合 Phase1 列定義追補`） |
| D | `docs/design/README.md` に「完成版索引」を追加 | 新規参画者向け一本化 |

### 3. 資料構成（完成版案）

```
docs/
├── design/                    # 正本（完成版仕様書）
│   ├── README.md              # 索引（入口）
│   ├── architecture.md        # Phase5 + 運用概要
│   ├── domain-model.md        # Phase1 意味 + Phase3 精算/按分
│   ├── database-schema.md     # 【新規推奨】Phase1 列定義（ChatGPT から移植）
│   ├── api-spec.md            # Phase2
│   ├── ai-pipeline.md         # Phase3 AI 部分
│   ├── frontend-screens.md    # Phase4
│   └── operations.md          # Phase5 運用（ChatGPT 対象外）
├── specs/
│   ├── chatgpt/               # 原文保管（変更しない）
│   └── comparison-chatgpt-vs-design.md  # 本ファイル
└── testing/
    └── findings.md            # 仕様の根拠（変更時は design へ反映）
```

### 4. 役割分担（今後のメンテ）

| 作業 | 担当ツール | 用途 |
|------|-----------|------|
| 列挙・網羅チェック | ChatGPT + ZIP | ルート/テーブル漏れ検出 |
| 業務ルール・例外 | Cursor + テスト | as-built 確定 |
| リグレッション | Vitest / Supertest | 仕様と実装の乖離検知 |

### 5. 次のアクション（優先順）

1. ~~**`database-schema.md` 新設**~~ — **完了**（[database-schema.md](../design/database-schema.md)）
2. ~~**`ai-pipeline.md` §3 を正**として Phase5 のデータフロー誤記を除外~~ — 差分表に誤記として記録済み
3. ~~**`frontend-screens.md` の Home 遷移**を正として Phase4 の誤記を除外~~ — 差分表に誤記として記録済み
4. ~~**精算 §5** は `docs/design/` のみが正~~ — 正本に記載済み
5. ~~**`comparison-*.md` を更新**して 🔴 項目を ✅ に変更~~ — **完了**（本節・横断サマリー）

---

## 統合実施記録（2026-06-18）

| Step | 内容 | 状態 |
|------|------|------|
| A | ChatGPT 原文を `docs/specs/chatgpt/` に保管 | 完了 |
| B | 差分表作成・🔴 項目のコード突合 | 完了 |
| C | `database-schema.md` 新設、`docs/design/` リンク更新 | 完了 |
| D | `docs/design/README.md` 完成版索引化 | 完了 |

**正本:** `docs/design/` — 入口は [design/README.md](../design/README.md)

---

## 関連

- [docs/design/plan.md](../design/plan.md) — Issue #90 計画
- [docs/design/README.md](../design/README.md) — 設計資料索引
- [docs/testing/findings.md](../testing/findings.md) — テスト由来の仕様補足
