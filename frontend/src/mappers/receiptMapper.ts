import type { ReceiptDetail } from '../types/receipt';

/** 統計画面プレビュー用。現時点は OpenAPI DTO をそのまま利用する。 */
export function mapReceiptDetailForStatsPreview(
  receipt: ReceiptDetail | null | undefined
): ReceiptDetail | null {
  return receipt ?? null;
}
