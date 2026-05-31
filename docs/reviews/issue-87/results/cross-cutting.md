# レビュー結果 — Issue #87-4 横断

| 項目 | 値 |
|------|-----|
| 対象 Issue | Issue #87-4 ([#260](https://github.com/yama180sx/receipt-ai-app/issues/260)) |
| レビュー日 | 2026-05-31 |
| ブランチ（作業用） | `feature/issue-87-4-settlement-types` |
| 前提 | #87-2 / #87-3 マージ済み |

## 対応一覧

| ID | 元 Issue | 内容 | 対応 |
|----|----------|------|------|
| 横断-01 | #87-3 R-F004 | 精算・割り勘画面の `any` | ✅ `frontend/src/types/settlement.ts` |
| 横断-02 | #87-3 R-F006 | 小計計算の FE/BE 明示的一致 | ✅ `itemLineTotal.ts` / `calcItemTotal` |
| 横断-03 | #87-2 R-B005 | `split: any` | ✅ 既に `SplitInput`（#87-2）。追記のみ |
| — | apiClient | 精算 API 戻り値型 | ✅ `getSettlementStatus` 等 |

## 見送り（本 Issue スコープ外）

| ID | 理由 |
|----|------|
| R-F005 | SplitEditor のコンポーネント分割 → Later |
| R-B006 | AppError / res.status 統一 → 精算以外も波及 |
| R-B008 | 精算 API の include 最適化 → Later |
| — | Issue #88 送金の取消・訂正 → #265 |
| — | `HistoryScreen` の `receipt: any` → 精算ドメイン外 |

## 明細小計の丸め規則

| 層 | 関数 | 式 |
|----|------|-----|
| Frontend | `calcItemTotal` | `Math.round(parseFloat(price) * parseFloat(quantity))` |
| Backend | `calcItemLineTotal` | 同上（`itemLineTotal.ts`） |
| 使用箇所 | `statsController`, `updateItemSplits` | `calcItemLineTotal(item.price, item.quantity)` |

## 手動確認

Issue #87-5 で実施済み → [regression-checklist.md](../regression-checklist.md)
