# Issue #98 — リファクタリング・実装計画

Epic: [#370 Issue #98](https://github.com/yama180sx/receipt-ai-app/issues/370)

本ドキュメントは **Issue #98** の成果物です。#98-1 以降のリファクタ実装で共通参照してください。

## 1. 方針サマリー

| 項目 | 決定内容 |
|------|----------|
| 入力ソース | [ChatGPT リファクタ案](../specs/chatgpt/ChatGPT_リファクタリング案.txt)（develop 解析）+ `docs/design/`（as-built 正本）+ コード突合 |
| 基本方針 | **DDD やり過ぎない**。Controller → Application/Domain Service → Prisma の現行構造を維持 |
| スコープ外 | 精算ドメインの再リファクタ（[#87 Epic](../reviews/issue-87/README.md) 完了済み）、React Navigation 導入、Supabase/クラウド移行 |
| テスト | 各 Must/Should 子 Issue で `npm test` 維持。[#91 テスト計画](../testing/plan.md) に準拠 |

## 2. ChatGPT 案の triage 結果

| ChatGPT 提案 | 判定 | 対応 Issue |
|--------------|------|------------|
| Issue1 Repository 全面導入 | **Later** | #98-8（Prisma `$extends` テナント注入と衝突。Drizzle 移行予定なし） |
| Issue2 ReceiptService 分割 | **Must**（修正） | #98-3（`duplicateReceiptService` / `categoryService` は既存。Controller 601行も対象） |
| Issue3 Transaction 境界 | **Should** | #98-4 |
| Issue4 型定義（`any` 排除） | **Must** | #98-2 |
| Issue5 Context 明示渡し | **Later** | #98-8 |
| Issue6 AI Provider 抽象化 | **Later** | #98-8（#91-7 と役割近接。Gemini 単一のため当面不要） |
| Issue7 Frontend `features/` | **Later** | #98-8（#87 R-F005 含む） |
| Issue8 Frontend API 統一 | **Should** | #98-7 |
| （追加）エラー統一 R-B006 | **Should** | #98-5 |
| （追加）statsController → Service | **Should** | #98-6 |

### ChatGPT 解析で判明した誤り（記録）

| 誤り | 正（as-built） |
|------|----------------|
| `receiptService` が最大 | `receiptController.ts` が **601行**、`receiptService` は 214行 |
| 重複チェックが receiptService 内 | `duplicateReceiptService.ts` **既に分離** |
| Worker 即 DB 保存（Phase5 仕様書） | `analyzeOnly` → 確認 → `commit` |

## 3. 着手順（Sprint）

```
#98-1（plan）→ #98-2（型）→ #98-3（Receipt）
    → #98-4（Transaction）→ #98-5 / #98-6 / #98-7（Should）
    → #98-8（Later バックログ）
```

| Sprint | 内容 | 子 Issue |
|--------|------|----------|
| 1 | 型定義強化 | #98-2 |
| 2 | Receipt パイプライン + Controller 薄型化 | #98-3 |
| 3 | Transaction 統一 | #98-4 |
| 4 | エラー / 精算 Service / FE API | #98-5, #98-6, #98-7 |
| — | Later バックログ | #98-8 |

## 4. 子 Issue 対応表

| 命名 | GitHub | 優先度 |
|------|--------|--------|
| #98-1 | [#371](https://github.com/yama180sx/receipt-ai-app/issues/371) | Must |
| #98-2 | [#372](https://github.com/yama180sx/receipt-ai-app/issues/372) | Must |
| #98-3 | [#373](https://github.com/yama180sx/receipt-ai-app/issues/373) | Must |
| #98-4 | [#374](https://github.com/yama180sx/receipt-ai-app/issues/374) | Should |
| #98-5 | [#375](https://github.com/yama180sx/receipt-ai-app/issues/375) | Should |
| #98-6 | [#376](https://github.com/yama180sx/receipt-ai-app/issues/376) | Should |
| #98-7 | [#377](https://github.com/yama180sx/receipt-ai-app/issues/377) | Should |
| #98-8 | [#378](https://github.com/yama180sx/receipt-ai-app/issues/378) | Later → Phase 2（[#392](https://github.com/yama180sx/receipt-ai-app/issues/392)〜[#404](https://github.com/yama180sx/receipt-ai-app/issues/404)） |

## 5. 関連資料

- [docs/design/](../design/) — 完成版仕様書（正本）
- [docs/specs/chatgpt/ChatGPT_リファクタリング案.txt](../specs/chatgpt/ChatGPT_リファクタリング案.txt)
- [docs/reviews/issue-87/should-backlog.md](../reviews/issue-87/should-backlog.md)
- [docs/testing/plan.md](../testing/plan.md)
- [docs/specs/chatgpt/ChatGPT_レビュー.txt](../specs/chatgpt/ChatGPT_レビュー.txt) — FE 画面肥大化の品質監査（#99 の根拠）

## 6. 完了サマリー / #99 反映 / #98-8 Phase 2 triage

> 更新: Issue #98-8-0（[#392](https://github.com/yama180sx/receipt-ai-app/issues/392)）。Epic #370 クローズ時点の記録。

### 6.1 Epic #98 実施結果（Done）

| 命名 | GitHub | 判定 | 主な成果 |
|------|--------|------|----------|
| #98-1 | [#371](https://github.com/yama180sx/receipt-ai-app/issues/371) | **Done** | 本 plan.md 初版 |
| #98-2 | [#372](https://github.com/yama180sx/receipt-ai-app/issues/372) | **Done** | BE 型定義・`any` 排除 |
| #98-3 | [#373](https://github.com/yama180sx/receipt-ai-app/issues/373) | **Done** | Receipt Service 分割、`receiptController` 601→266行 |
| #98-4 | [#374](https://github.com/yama180sx/receipt-ai-app/issues/374) | **Done** | Transaction 境界統一 |
| #98-5 | [#375](https://github.com/yama180sx/receipt-ai-app/issues/375) | **Done** | エラー統一（R-B006 解消） |
| #98-6 | [#376](https://github.com/yama180sx/receipt-ai-app/issues/376) | **Done** | statsController → SettlementService |
| #98-7 | [#377](https://github.com/yama180sx/receipt-ai-app/issues/377) | **Done** | FE `src/api/` 統一 |

### 6.2 Epic #99 実施結果（ChatGPT レビュー FE 対応 — #98 スコープ外）

[ChatGPT レビュー](../specs/chatgpt/ChatGPT_レビュー.txt) が指摘した 500 行級 Screen 分解。リファクタ案（Issue1〜8）の Must/Should 完了後に別 Epic として実施。

| 命名 | GitHub | 判定 | 主な成果 |
|------|--------|------|----------|
| #99 Epic | [#386](https://github.com/yama180sx/receipt-ai-app/issues/386) | **Done** | FE 画面責務分割 |
| #99-1 | [#387](https://github.com/yama180sx/receipt-ai-app/issues/387) | **Done** | Settlement Hook + コンポーネント（597→103行） |
| #99-2 | [#388](https://github.com/yama180sx/receipt-ai-app/issues/388) | **Done** | Home Hook 化（583→424行） |
| #99-3 | [#389](https://github.com/yama180sx/receipt-ai-app/issues/389) | **Done** | App セッション / ViewRouter 分離（501→211行） |

附記: `SplitEditorScreen` 588→146行（#99-1 内）。新規 Hook: `useSettlementSummary`, `useSplitEditor`, `useHomeDashboard`, `useReceiptUpload`, `useAppSession`。

### 6.3 #98-8 再 triage（Later → Phase 2 実装）

当初 [#378](https://github.com/yama180sx/receipt-ai-app/issues/378) は「実装しないバックログ」だったが、プロ品質 Phase 2 として子 Issue に切り出し、[#378](https://github.com/yama180sx/receipt-ai-app/issues/378) を **実装 Epic** として継続する。

| 元項目（§2） | 当初判定 | 再判定 | 子 Issue | 備考 |
|--------------|----------|--------|----------|------|
| Issue1 Repository 全面導入 | Later | **実施**（段階） | [#399](https://github.com/yama180sx/receipt-ai-app/issues/399), [#400](https://github.com/yama180sx/receipt-ai-app/issues/400) | 拡張済み `prisma`（`$extends` テナント）を Repository 内部で利用 |
| Issue5 Context 明示渡し | Later | **実施**（段階） | [#397](https://github.com/yama180sx/receipt-ai-app/issues/397), [#398](https://github.com/yama180sx/receipt-ai-app/issues/398) | ALS 全面削除はしない（Worker 用に残す） |
| Issue6 AI Provider 抽象化 | Later | **実施** | [#396](https://github.com/yama180sx/receipt-ai-app/issues/396) | Gemini 単一でもテスト容易性向上 |
| Issue7 Frontend `features/` | Later | **実施**（段階） | [#393](https://github.com/yama180sx/receipt-ai-app/issues/393) | #99 成果物の移行 |
| R-B008 精算クエリ最適化 | Later | **実施** | [#395](https://github.com/yama180sx/receipt-ai-app/issues/395) | #87 バックログ |
| FE 残存 `any` | — | **実施** | [#394](https://github.com/yama180sx/receipt-ai-app/issues/394) | #98-2 スコープ外（管理系画面等） |
| OpenAPI 型生成 | — | **実施** | [#401](https://github.com/yama180sx/receipt-ai-app/issues/401), [#402](https://github.com/yama180sx/receipt-ai-app/issues/402) | #402 は Later |
| Expo Router | スコープ外 | **実施**（PoC→本番） | [#403](https://github.com/yama180sx/receipt-ai-app/issues/403), [#404](https://github.com/yama180sx/receipt-ai-app/issues/404) | #404 は PoC Go 時 |

#### Won't fix / 見送り（記録）

| 項目 | 判定 | 理由 |
|------|------|------|
| Drizzle ORM 移行 | **Won't fix** | Prisma + `$extends` で十分。移行予定なし |
| React Navigation 導入 | **Won't fix** | Expo Router を採用（#403 / #404） |
| 精算ドメイン再リファクタ | **スコープ外** | #87 完了済み |
| AsyncLocalStorage 全面削除 | **見送り** | Worker / バックグラウンドは `runWithTenant` を維持 |

### 6.4 #98-8 子 Issue 対応表

| 命名 | GitHub | 優先度 | 見積（AI 補助） |
|------|--------|--------|----------------|
| #98-8-0 | [#392](https://github.com/yama180sx/receipt-ai-app/issues/392) | Must | 0.5 人日 |
| #98-8-1 | [#393](https://github.com/yama180sx/receipt-ai-app/issues/393) | Should | 1〜1.5 人日 |
| #98-8-2 | [#394](https://github.com/yama180sx/receipt-ai-app/issues/394) | Should | 1 人日 |
| #98-8-3 | [#395](https://github.com/yama180sx/receipt-ai-app/issues/395) | Should | 1〜2 人日 |
| #98-8-4 | [#396](https://github.com/yama180sx/receipt-ai-app/issues/396) | Should | 1〜1.5 人日 |
| #98-8-5 | [#397](https://github.com/yama180sx/receipt-ai-app/issues/397) | Should | 2〜3 人日 |
| #98-8-6 | [#398](https://github.com/yama180sx/receipt-ai-app/issues/398) | Should | 1.5〜2 人日 |
| #98-8-7 | [#399](https://github.com/yama180sx/receipt-ai-app/issues/399) | Should | 2〜3 人日 |
| #98-8-8 | [#400](https://github.com/yama180sx/receipt-ai-app/issues/400) | Should | 2〜3 人日 |
| #98-8-9 | [#401](https://github.com/yama180sx/receipt-ai-app/issues/401) | Should | 2〜3 人日 |
| #98-8-10 | [#402](https://github.com/yama180sx/receipt-ai-app/issues/402) | Later | 2〜3 人日 |
| #98-8-11 | [#403](https://github.com/yama180sx/receipt-ai-app/issues/403) | Should | 1.5〜2 人日 |
| #98-8-12 | [#404](https://github.com/yama180sx/receipt-ai-app/issues/404) | Later | 4〜6 人日 |

### 6.5 Phase 2 推奨着手順

```
#392（本 Issue）→ #393 → #395 → #394 → #396
  → #397 → #398 → #399 → #400 → #401 → #402
  → #403（PoC）→ #404（Go 時）
```

Navigation（#403 / #404）は Phase 2 中でリスク最高。Android / iOS / Web 同一 Screen 構成は維持。Web の URL / リロード / ブラウザ戻るを PoC で重点検証する。

## 7. Epic #100 — ChatGPT レビュー 20260621 フォローアップ（Phase 3）

Epic: [#423 Epic #100](https://github.com/yama180sx/receipt-ai-app/issues/423)

[ChatGPT レビュー 20260621](../specs/chatgpt/ChatGPT_レビュー_20260621.txt)（74/100点）のフォローアップ。#98 / #99 / #98-8 Phase 2 完了後も残る **層境界・Screen 肥大・型/Mapper 不足** を解消する。

### 7.1 方針サマリー

| 項目 | 決定内容 |
|------|----------|
| 入力ソース | ChatGPT レビュー 20260621 + 本セッション設計議論 + コード突合 |
| BE 方針 | Service = Application 層。UseCase 物理層は新設しない |
| FE 方針 | Hook = Application 層。Style Pattern 段階移行（big-bang 禁止） |
| 型方針 | DTO = `api/generated`、ViewModel = `types/`、変換 = `mappers/` |
| スコープ外 | Drizzle 移行、UseCase フォルダ新設、StyleSheet big-bang 一括 PR |

### 7.2 子 Issue 対応表

| 命名 | GitHub | 優先度 | 見積（AI 補助） |
|------|--------|--------|----------------|
| #100 Epic | [#423](https://github.com/yama180sx/receipt-ai-app/issues/423) | — | — |
| #100-0 | [#424](https://github.com/yama180sx/receipt-ai-app/issues/424) | Must | 0.5 人日 |
| #100-1 | [#425](https://github.com/yama180sx/receipt-ai-app/issues/425) | Must | 1.5〜2 人日 |
| #100-2 | [#426](https://github.com/yama180sx/receipt-ai-app/issues/426) | Must | 1.5〜2 人日 |
| #100-3 | [#427](https://github.com/yama180sx/receipt-ai-app/issues/427) | Must | 1〜1.5 人日 |
| #100-4 | [#428](https://github.com/yama180sx/receipt-ai-app/issues/428) | Must | 1.5〜2 人日 |
| #100-5 | [#429](https://github.com/yama180sx/receipt-ai-app/issues/429) | Should | 1〜1.5 人日 |
| #100-6 | [#430](https://github.com/yama180sx/receipt-ai-app/issues/430) | Must | 0.5 人日 |
| #100-7 | [#431](https://github.com/yama180sx/receipt-ai-app/issues/431) | Must | 1.5〜2 人日 |
| #100-8 | [#432](https://github.com/yama180sx/receipt-ai-app/issues/432) | Must | 1.5〜2 人日 |
| #100-9 | [#433](https://github.com/yama180sx/receipt-ai-app/issues/433) | Must | 1 人日 |
| #100-10 | [#434](https://github.com/yama180sx/receipt-ai-app/issues/434) | Should | 1 人日 |
| #100-11 | [#435](https://github.com/yama180sx/receipt-ai-app/issues/435) | Should | 0.5 人日 |
| #100-12 | [#436](https://github.com/yama180sx/receipt-ai-app/issues/436) | Should | 1〜1.5 人日 |
| #100-13 | [#437](https://github.com/yama180sx/receipt-ai-app/issues/437) | Should | 0.5〜1 人日 |
| #100-14 | [#438](https://github.com/yama180sx/receipt-ai-app/issues/438) | Should | 1.5〜2 人日 |
| #100-15 | [#439](https://github.com/yama180sx/receipt-ai-app/issues/439) | Must | 0.5 人日 |
| #100-16 | [#440](https://github.com/yama180sx/receipt-ai-app/issues/440) | Should | 1〜1.5 人日 |

### 7.3 #98-8 との関係（重複しない既存 Issue）

| 既存 Issue | 内容 | #100 との関係 |
|-----------|------|--------------|
| #393 [#98-8-1] | features/ 移行 | #100-5 が auth/stats/history/category を補完 |
| #394 [#98-8-2] | FE 残存 any 排除 | 並行実施（#100 スコープ外） |
| #397 [#98-8-5] | Context 明示渡し | 並行実施 |
| #398 [#98-8-6] | prisma `$extends` 型安全化 | 並行実施 |
| #399 [#98-8-7] | Repository Phase 1 | #100-2 の前提 |
| #400 [#98-8-8] | Repository Phase 2 | #100-3 の前提 |
| #401 [#98-8-9] | OpenAPI 型生成 | #100-4 の前提 |

### 7.4 Won't fix / 見送り（記録）

| 項目 | 判定 | 理由 |
|------|------|------|
| Drizzle ORM 移行 | **Won't fix** | 現状 pain point なし。Prisma `$extends` テナント資産を維持 |
| UseCase 物理層（`usecases/` フォルダ） | **Won't fix** | Service / Hook = Application 層として十分 |
| StyleSheet big-bang 一括 PR | **Won't fix** | #100-6〜#100-11 で計画的段階移行 |

### 7.5 推奨着手順

```
#424（#100-0 plan）→ #425 → #426 → #427 → #428 → #439
  → #430 → #431 / #432 / #433（並行可）
  → #434 → #435
  → #436 → #437 → #438 → #440

（#98-8 と並行: #393, #394, #397, #399, #400, #401）
```

## 8. Epic #101 — ChatGPT レビュー 20260622 フォローアップ（Phase 4）

Epic: [#459 Epic #101](https://github.com/yama180sx/receipt-ai-app/issues/459)

[ChatGPT レビュー 20260622](../specs/chatgpt/ChatGPT_レビュー_20260622.txt)（**79/100点**）のフォローアップ。Epic #100 完了後も残る **画面肥大・画像処理/UI 混在・backend any 残存・API エラー処理散在** を解消し、AI 駆動開発向けの **フロント実装規約** も整備する。

### 8.1 方針サマリー

| 項目 | 決定内容 |
|------|----------|
| 入力ソース | ChatGPT レビュー 20260622 + コード突合 + Epic #99 / #100 成功パターン |
| FE 方針 | Screen = hook + 子コンポーネント（**150行以内**）。#387 / #431 と同型 |
| BE 方針 | 残存 `any` / `as any` を Express 型拡張・`unknown` で撲滅（局所修正） |
| エラー方針 | FE: `getApiErrorMessage` / `showApiErrorAlert` に統一。BE: #101-3 は middleware 層中心 |
| AI 駆動 | #101-7 で規約 + プロンプトテンプレートを正本化し、以降の実装 Issue で参照 |
| スコープ外 | React Hook Form、Context 新規追加、big-bang 一括 PR |

### 8.2 レビュー減点と対応マッピング

| 観点 | 点数 | 主な対応 Issue |
|------|------|----------------|
| DRY / 共通化 | 18/25 | #101-6 |
| 責務分割 | 20/25 | #101-1, #101-2, #101-4, #101-5 |
| 型定義 | 22/25 | #101-3 |
| 保守性 | 19/25 | #101-7 + 上記 |

### 8.3 子 Issue 対応表

| 命名 | GitHub | 優先度 | 見積（AI 補助） |
|------|--------|--------|----------------|
| #101 Epic | [#459](https://github.com/yama180sx/receipt-ai-app/issues/459) | — | — |
| #101-0 | [#460](https://github.com/yama180sx/receipt-ai-app/issues/460) | Must | 0.5 人日 |
| #101-1 | [#465](https://github.com/yama180sx/receipt-ai-app/issues/465) | Must | 1 人日 |
| #101-2 | [#466](https://github.com/yama180sx/receipt-ai-app/issues/466) | Must | 1 人日 |
| #101-3 | [#467](https://github.com/yama180sx/receipt-ai-app/issues/467) | Must | 0.5〜1 人日 |
| #101-4 | [#462](https://github.com/yama180sx/receipt-ai-app/issues/462) | Should | 1 人日 |
| #101-5 | [#463](https://github.com/yama180sx/receipt-ai-app/issues/463) | Should | 1 人日 |
| #101-6 | [#464](https://github.com/yama180sx/receipt-ai-app/issues/464) | Should | 0.5〜1 人日 |
| #101-7 | [#461](https://github.com/yama180sx/receipt-ai-app/issues/461) | Must | 0.5 人日 |

### 8.4 #100 との関係（重複しないスコープ）

| #100 で実施済み | #101 で追加する理由 |
|----------------|---------------------|
| Login / Home / Statistics 等の Screen 分解 | **PromptEditorScreen**（355行）・**ReceiptImageCropModal**（287行）・**SplitEditorItemTable**（292行）が未対応 |
| BE Repository / authService 本実装 | middleware 層の残存 `any`（`authMiddleware` / `validate` 等）が未対応 |
| `getApiErrorMessage` 導入・Alert 統一 | Hook 層での `console.error` + 固定メッセージが残存（ProductMaster 等） |
| architecture.md as-built（#100-15） | AI 駆動向け **実装規約・プロンプトテンプレート** は未整備 |

**重複しないことの確認**: #101 は #100 で触っていないファイル・運用ルールに限定する。層境界の全面整理（Mapper / OpenAPI drift CI）は **Epic #102 / #103**（Phase 5）へ委譲。

### 8.5 Won't fix / Later（記録）

| 項目 | 判定 | 対応 |
|------|------|------|
| React Hook Form 導入 | **Won't fix** | hook 分割で十分（#101-1） |
| Context 新規追加 | **Won't fix** | #101-7 で既存 Context のみと明文化 |
| frontend/backend 型の完全共有（C-2） | **Later → Epic #102** | [#468](https://github.com/yama180sx/receipt-ai-app/issues/468) |
| API 層 DTO / 変換 / エラー完全分離（C-4） | **Later → Epic #103** | [#469](https://github.com/yama180sx/receipt-ai-app/issues/469) |

### 8.6 推奨着手順

```
#460（#101-0 plan）→ #461（#101-7 規約）→ #465 → #466 → #467
  → #462 / #463（並行可）→ #464
  → Epic #102 / #103（#101 完了後）
```

**Screen 分解の参考パターン**: Epic #99 [#387](https://github.com/yama180sx/receipt-ai-app/issues/387)（SplitEditorScreen 588→146行）、Epic #100 [#431](https://github.com/yama180sx/receipt-ai-app/issues/431)（LoginScreen + useLoginFlow）。

### 8.7 後続 Epic（Phase 5、本 Epic スコープ外）

| Epic | GitHub | テーマ |
|------|--------|--------|
| #102 | [#468](https://github.com/yama180sx/receipt-ai-app/issues/468) | API 契約型 SSOT（OpenAPI drift CI、FE/BE 型整合） |
| #103 | [#469](https://github.com/yama180sx/receipt-ai-app/issues/469) | Backend 層境界（Response Mapper、errorHandler 一本化） |

詳細は各 Epic の #102-0 / #103-0（plan 追記 Issue）で正本化する。

