import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/appError';
import logger from '../utils/logger';

/**
 * グローバルエラーハンドリング・ミドルウェア
 * レスポンス形式を統一し、T320のログファイルへ詳細を出力する
 */
export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // AppError インスタンスか、それ以外の予期せぬエラーかを判定
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  const message = err.message || 'Internal Server Error';
  const details = err instanceof AppError ? err.details : undefined;

  // T320の DailyRotateFile (error-DATE.log) へ出力
  // logger.ts で errors({ stack: true }) を指定しているため、スタックトレースも含まれる
  logger.error(message, {
    statusCode,
    path: req.originalUrl,
    method: req.method,
    details,
    stack: err.stack,
  });

  // クライアント（Expo/Frontend）へのレスポンス形式を統一
  res.status(statusCode).json({
    success: false,
    error: message,
    ...(details && { details }), // details が存在する場合のみ含める
  });
};