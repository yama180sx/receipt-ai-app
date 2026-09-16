export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: unknown;
  /** クライアントが分岐に利用できる、秘密値を含まない固定エラーコード。 */
  public readonly code?: string;

  constructor(message: string, statusCode: number, details?: unknown, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true; // 予測可能な業務エラー
    this.details = details;
    this.code = code;

    Error.captureStackTrace(this, this.constructor);
  }
}
