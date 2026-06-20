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
| #98-8 | [#378](https://github.com/yama180sx/receipt-ai-app/issues/378) | Later |

## 5. 関連資料

- [docs/design/](../design/) — 完成版仕様書（正本）
- [docs/specs/chatgpt/ChatGPT_リファクタリング案.txt](../specs/chatgpt/ChatGPT_リファクタリング案.txt)
- [docs/reviews/issue-87/should-backlog.md](../reviews/issue-87/should-backlog.md)
- [docs/testing/plan.md](../testing/plan.md)
