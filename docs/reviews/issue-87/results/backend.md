# レビュー結果 — Issue #87-2 Backend

| 項目 | 値 |
|------|-----|
| 対象 Issue | #87-2 ([#258](https://github.com/yama180sx/receipt-ai-app/issues/258)) |
| レビュー日 | 2026-05-30 |
| ブランチ（作業用） | `feature/issue-87-2-backend-settlement-review` |
| 対象 | `statsController.ts`, `receiptController.updateItemSplits`, routes |

## 採点サマリー

| 観点 | スコア (/100) | 主な減点理由 |
|------|---------------|----------------|
| アーキテクチャ | 72 | 集計・按分計算が Controller に直書き。責務分離は Should |
| 型の堅牢性 | 65 | `splits: any`、送金 API の body 型なし |
| パフォーマンス・手戻り | 70 | 月境界 UTC/ISO ずれ、按分の二重端数補正、メンバー未検証 |
| **総合（参考）** | **69** | |

## 指摘一覧

| ID | 優先度 | 観点 | ファイル | 要約 | 振り分け | 対応 |
|----|--------|------|----------|------|----------|------|
| R-B001 | **Must** | 手戻り | `statsController.ts` | 対象月デフォルト・範囲が `toISOString`/UTC 基準で、レシート `date`（ローカル/JST 生成）とずれる | #87-2 | ✅ `yearMonth.ts` でローカル月範囲 |
| R-B002 | **Must** | データ整合 | `updateItemSplits` | `familyMemberId` が同一世帯か未検証 | #87-2 | ✅ 保存前に世帯メンバー照合 |
| R-B003 | **Must** | データ整合 | `updateItemSplits` | 端数を「最後のメンバー」に寄せた後、先頭へ再補正する二重ロジックで意図と不一致 | #87-2 | ✅ `itemSplitAllocation.ts` に一本化 |
| R-B004 | **Must** | データ整合 | `updateItemSplits` | 按分合計≠小計・負の按分額を許容しうる | #87-2 | ✅ 合計検証・負数拒否 |
| R-B005 | Should | 型 | `updateItemSplits` | `split: any` | #87-4 | ✅ #87-2 で `SplitInput`（#87-4 で記録） |
| R-B006 | Should | アーキ | `statsController` | `AppError` と直 `res.status` 混在 | #87-2 | 未対応 |
| R-B007 | Should | 型 | `addSettlementTransfer` | `month` 形式未検証 | #87-2 | ✅ `normalizeYearMonth` |
| R-B008 | Later | 性能 | `getSettlementStatus` | レシート全件+明細 include（世帯小なら許容） | — | 未対応 |
| R-B009 | **Must** | データ整合 | `getReceipts` | `memberId=""`（世帯全体）でも `x-member-id` にフォールバックし自分のレシートのみ | #87-2 | ✅ 空文字は全件、月範囲もローカル TZ |

## Must の実装方針（実装済み・未コミット）

### R-B001

- `getCurrentYearMonthLocal()` / `getLocalMonthDateRange()` を `backend/src/utils/yearMonth.ts` に追加
- `getSettlementStatus` のデフォルト月・`date` フィルタに適用

### R-B002〜R-B004

- `allocateItemSplits()` を `backend/src/utils/itemSplitAllocation.ts` に抽出
- 保存前に `familyMemberId in splits` が `familyGroupId` 所属か検証
- 二重端数補正ブロックを削除

### R-B007

- 送金登録時 `month` を `normalizeYearMonth` で検証

### R-B009

- `getReceipts`: `memberId` クエリが空のときは世帯全件（ヘッダーにフォールバックしない）
- 履歴の月フィルタも `getLocalMonthDateRange` に統一

## 手動確認

Issue #87-5 で実施済み → [regression-checklist.md](../regression-checklist.md)

## Should / Later（バックログ）

- R-B005, R-B006, R-B008 は別 PR または #87-4 で検討
