import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/appError';
import { zodErrorToAppError } from '../utils/zodError';
import logger from '../utils/logger';
import { DuplicateReceiptError } from '../services/receipt/receiptDuplicateError';

/**
 * 📂 グローバルエラーハンドリング・ミドルウェア [Issue #47 / #98-5 / #103-4]
 */
export const errorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const normalized =
    err instanceof ZodError ? zodErrorToAppError(err) : err;

  const isDev = process.env.NODE_ENV === 'development';
  const error = normalized as Error & { statusCode?: number; details?: unknown; stack?: string };

  const statusCode =
    normalized instanceof AppError ? normalized.statusCode : (error.statusCode || 500);
  const message = error.message || 'Internal Server Error';
  const details = normalized instanceof AppError ? normalized.details : undefined;

  logger.error(`[${req.method}] ${req.path} - ${message}`, {
    statusCode,
    method: req.method,
    path: req.originalUrl,
    details,
    stack: error.stack,
    internal: normalized,
  });

  // api-spec §2.3: 重複レシート（409）は existingId をトップレベルに含める
  if (normalized instanceof DuplicateReceiptError) {
    return res.status(409).json({
      success: false,
      message: 'DUPLICATE',
      existingId: normalized.existingId,
    });
  }

  if (isDev) {
    return res.status(statusCode).json({
      success: false,
      message,
      stack: error.stack,
      details,
      internal: normalized,
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
