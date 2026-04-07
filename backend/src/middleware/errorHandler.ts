import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/appError';
import logger from '../utils/logger';

/**
 * 📂 グローバルエラーハンドリング・ミドルウェア [Issue #47]
 */
export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const isDev = process.env.NODE_ENV === 'development';
  
  // ステータスコードとメッセージの決定
  const statusCode = err instanceof AppError ? err.statusCode : (err.statusCode || 500);
  const message = err.message || 'Internal Server Error';
  const details = err instanceof AppError ? err.details : undefined;

  // 1. T320 のログファイル (error-DATE.log) へ常にフルスタックを出力
  logger.error(`[${req.method}] ${req.path} - ${message}`, {
    statusCode,
    method: req.method,
    path: req.originalUrl,
    details,
    stack: err.stack,
    internal: err // Prisma等の生エラーオブジェクト
  });

  // 2. クライアント（Expo）へのレスポンス
  // キーを 'message' に統一することで Expo 側のコードと同期させます
  if (isDev) {
    return res.status(statusCode).json({
      success: false,
      message: message, // 'error' から 'message' に変更
      stack: err.stack,
      details: details,
      internal: err
    });
  } else {
    const safeMessage = statusCode >= 500 
      ? 'サーバー内部でエラーが発生しました。時間をおいて再度お試しください。' 
      : message;

    return res.status(statusCode).json({
      success: false,
      message: safeMessage, // 'error' から 'message' に変更
      ...(details && { details })
    });
  }
};