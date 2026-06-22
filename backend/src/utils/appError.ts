export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: unknown;

  constructor(message: string, statusCode: number, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true; // 予測可能な業務エラー
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
  }
}