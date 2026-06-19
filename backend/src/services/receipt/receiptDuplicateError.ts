import { AppError } from '../../utils/appError';

/** commit / 手動登録時の重複レシート検出（api-spec §2.3 特殊ケース 409） */
export class DuplicateReceiptError extends AppError {
  readonly existingId: number | null;

  constructor(existingId?: number | null) {
    super('DUPLICATE', 409);
    this.name = 'DuplicateReceiptError';
    this.existingId = existingId ?? null;
  }
}

export function isDuplicateReceiptError(error: unknown): error is DuplicateReceiptError {
  return error instanceof DuplicateReceiptError;
}

export function getDuplicateExistingId(error: unknown): number | null {
  if (error instanceof DuplicateReceiptError) return error.existingId;
  return null;
}
