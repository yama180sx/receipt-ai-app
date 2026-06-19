/** commit / 手動登録時の重複レシート検出 */
export class DuplicateReceiptError extends Error {
  readonly statusCode = 409;
  readonly existingId: number | null;

  constructor(existingId?: number | null) {
    super('DUPLICATE_RECEIPT_DETECTED');
    this.name = 'DuplicateReceiptError';
    this.existingId = existingId ?? null;
  }
}

export function isDuplicateReceiptError(error: unknown): error is DuplicateReceiptError {
  return (
    error instanceof DuplicateReceiptError ||
    (typeof error === 'object' &&
      error !== null &&
      'statusCode' in error &&
      (error as { statusCode: number }).statusCode === 409)
  );
}

export function getDuplicateExistingId(error: unknown): number | null {
  if (error instanceof DuplicateReceiptError) return error.existingId;
  if (typeof error === 'object' && error !== null && 'existingId' in error) {
    const id = (error as { existingId?: number | null }).existingId;
    return id ?? null;
  }
  return null;
}
