import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/appError';
import logger from '../utils/logger';
import { DuplicateReceiptError } from '../services/receipt/receiptDuplicateError';

/**
 * 📂 グローバルエラーハンドリング・ミドルウェア [Issue #47 / #98-5]
 */
export const errorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const isDev = process.env.NODE_ENV === 'development';
  const error = err as Error & { statusCode?: number; details?: unknown; stack?: string };

  const statusCode = err instanceof AppError ? err.statusCode : (error.statusCode || 500);
  const message = error.message || 'Internal Server Error';
  const details = err instanceof AppError ? err.details : undefined;

  logger.error(`[${req.method}] ${req.path} - ${message}`, {
    statusCode,
    method: req.method,
    path: req.originalUrl,
    details,
    stack: error.stack,
    internal: err,
  });

  // api-spec §2.3: 重複レシート（409）は existingId をトップレベルに含める
  if (err instanceof DuplicateReceiptError) {
    return res.status(409).json({
      success: false,
      message: 'DUPLICATE',
      existingId: err.existingId,
    });
  }

  if (isDev) {
    return res.status(statusCode).json({
      success: false,
      message,
      stack: error.stack,
      details,
      internal: err,
    });
  }

  const safeMessage =
    statusCode >= 500
      ? 'サーバー内部でエラーが発生しました。時間をおいて再度お試しください。'
      : message;

  const responseBody: { success: false; message: string; details?: unknown } = {
    success: false,
    message: safeMessage,
  };
  if (details !== undefined) {
    responseBody.details = details;
  }

  return res.status(statusCode).json(responseBody);
};