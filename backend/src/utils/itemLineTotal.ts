/**
 * 明細行の税込小計（円・整数丸め）— **SSOT（Single Source of Truth）**
 *
 * 按分・精算の itemLineTotal 計算の正本。Frontend は UI プレビュー用に
 * `frontend/src/domain/settlement/itemSplit.ts` の `calcItemTotal` がミラー実装。
 *
 * 変更時: `docs/testing/fixtures/itemLineTotal-vectors.json` を更新し、
 * BE/FE の contract test がパスすることを確認する（#105-1）。
 *
 * @see docs/design/domain-model.md §4.1
 */
export function calcItemLineTotal(price: unknown, quantity: unknown = 1): number {
  const unit =
    typeof price === 'number' ? price : parseFloat(String(price ?? 0)) || 0;
  const qty =
    typeof quantity === 'number'
      ? quantity
      : parseFloat(String(quantity ?? 1)) || 1;
  return Math.round(unit * qty);
}
