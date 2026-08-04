import { getCleanText } from './normalizer';

/**
 * 実レシートで確認した、商品種別を持たない値引き・アプリ適用のOCR表記。
 * 負額だけでは返品・返金等を除外できないため、明細名の限定パターンと組み合わせる。
 */
const nonProductAdjustmentNamePatterns = [
  /^▼\d{8}app$/,
  /^line割引 \d+%$/,
  /^まとめ売り値引$/,
  /^感謝デー \d+%$/,
] as const;

export function isNonProductAdjustmentLine(input: { itemName: string; price?: number }): boolean {
  if (input.price === undefined || !Number.isFinite(input.price) || input.price >= 0) return false;
  const normalizedName = getCleanText(input.itemName);
  return nonProductAdjustmentNamePatterns.some((pattern) => pattern.test(normalizedName));
}
