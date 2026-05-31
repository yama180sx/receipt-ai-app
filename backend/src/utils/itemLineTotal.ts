/**
 * 明細行の税込小計（円・整数丸め）。
 * Frontend の calcItemTotal（splitEditorSplits.ts）と同じ式。
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
