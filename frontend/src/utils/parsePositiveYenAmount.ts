const NEGATIVE_AMOUNT_PATTERN = /[-－−]/;

/** 入力にマイナス記号（半角・全角・数学記号）が含まれるか */
export function hasNegativeAmountSign(raw: string): boolean {
  return NEGATIVE_AMOUNT_PATTERN.test(raw.trim());
}

/**
 * 送金額など、正の整数円のみ受け付けるパース。
 * 「-5000」のようにマイナスを含む場合は null（数字だけ抜いて正にしない）。
 */
export function parsePositiveYenAmount(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed || hasNegativeAmountSign(trimmed)) {
    return null;
  }
  const digitsOnly = trimmed.replace(/[^0-9]/g, '');
  if (!digitsOnly) {
    return null;
  }
  const amount = parseInt(digitsOnly, 10);
  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }
  return amount;
}
