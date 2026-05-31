# Should / Later バックログ — Issue #87 Epic 完了後

Issue #87-5 時点で **Epic #246 の完了をブロックしない** 項目の一覧。必要に応じて別 Issue 化する。

| ID | 優先度 | 内容 | 推奨行き先 |
|----|--------|------|------------|
| R-F005 | Later | `SplitEditorScreen` のコンポーネント分割 | 新規 Issue（UI リファクタ） |
| R-B006 | Should | `AppError` と `res.status` 混在 | Epic 外・横断リファクタ |
| R-B008 | Later | `getSettlementStatus` の全件 include | 性能 Issue（世帯規模が増えたら） |
| — | — | 送金記録の取消・訂正 | [Issue #88 #265](https://github.com/yama180sx/receipt-ai-app/issues/265) |
| — | — | `HistoryScreen` の `receipt: any` | #87-4 スコープ外・任意 |

## Won't fix / 受容（記録のみ）

| 項目 | 理由 |
|------|------|
| マイナス送金による相殺 | 仕様として採用しない。訂正は #88 で対応予定 |
