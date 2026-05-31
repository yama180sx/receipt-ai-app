# レビュー対象スコープ（Issue #87）

## ドメイン定義

**精算・按分** = レシート明細ごとの負担額（ItemSplit）の保存・集計、月間精算サマリー、家族間送金（SettlementTransfer）。

## 対象ファイル（必須）

### Backend — #87-2 担当

| ファイル | 行数目安 | レビュー焦点 |
|----------|----------|----------------|
| `backend/src/controllers/statsController.ts` | 全ファイル (~192) | `getSettlementStatus` 集計、送金反映、`addSettlementTransfer` |
| `backend/src/controllers/receiptController.ts` | **L462〜L535 付近** | `updateItemSplits` のみ（按分保存・端数・バリデーション） |
| `backend/src/routes/statsRoutes.ts` | 全ファイル | `/settlement`, `/settlement/transfers` |
| `backend/src/routes/receiptRoutes.ts` | **L105〜L106 付近** | `POST .../items/:itemId/splits` のルーティング |
| `backend/prisma/schema.prisma` | **ItemSplit, SettlementTransfer** | モデル定義・リレーション・暗黙デフォルトのコメント |

### Frontend — #87-3 担当

| ファイル | 行数目安 | レビュー焦点 |
|----------|----------|----------------|
| `frontend/src/screens/SplitEditorScreen.tsx` | 全ファイル (~569) | ％/円双方向、端数負担、一括調整、保存 API 呼び出し |
| `frontend/src/screens/SettlementSummaryScreen.tsx` | 全ファイル (~428) | 月選択、サマリーカード、送金モーダル、API 連携 |

### 横断 — #87-4 担当（#87-2/3 の結果から抽出）

- 精算 API レスポンス型とフロント `summaryData` の対応
- 金額丸め・合計整合の重複ロジック（Backend vs Frontend）

## 参照のみ（今回の Must 実装対象外）

| ファイル | 理由 |
|----------|------|
| `receiptController.ts` の按分以外 | レシート CRUD・統計クエリは別ドメイン。必要なら Should で #87-2 にメモ |
| `ReceiptDetailComponent.tsx` | カテゴリ変更中心。#86 でフォーム共通化済み |
| `SplitEditorScreen` 按分テーブル内 `TextInput` | Epic #87 スコープ外（#86 と同様） |
| `HomeScreen`, `StatisticsScreen` | 家計統計は精算 Epic の外 |

## スコープ外（触らない）

- #82〜#86 の UI 共通化・`AppSelect` / `AppButton` の見た目
- 新機能（精算ルール変更、新 API）
- Gemini / プロンプト / レシート解析パイプライン
- **#87-0** の Category シーケンス（[#256](https://github.com/yama180sx/receipt-ai-app/issues/256) で別 PR）

## LLM への渡し方

1. 上記「必須」ファイルを **該当 Issue 担当分だけ** 添付（全文または差分）
2. `prompt.md` の本文をそのまま先頭に付ける
3. 出力は `review-result-template.md` 形式で Issue コメント or `docs/reviews/issue-87/results/` に保存（#87-2 着手時に `results/` 作成可）
