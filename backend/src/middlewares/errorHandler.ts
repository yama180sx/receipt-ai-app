import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/appError';
import logger from '../utils/logger';

/**
 * 📂 グローバルエラーハンドリング・ミドルウェア [Issue #47]
 * - 開発環境: スタックトレースを含む詳細情報をクライアントに返す
 * - 本番環境: セキュリティのため内部エラーを隠蔽し、抽象化されたメッセージを返す
 * - 共通: T320のログファイルには常にフルスタックトレースを出力する
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

  // 1. T320 のログファイル (error-DATE.log) へ常に詳細を出力
  logger.error(`[${req.method}] ${req.path} - ${message}`, {
    statusCode,
    method: req.method,
    path: req.originalUrl,
    details,
    stack: err.stack, // 開発・本番問わずサーバー側にはログを残す
    internal: err     // Prisma等の生エラーオブジェクト
  });

  // 2. クライアント（Expo/Frontend）へのレスポンス制御
  if (isDev) {
    // 開発用：デバッグ効率を最大化する詳細レスポンス
    return res.status(statusCode).json({
      success: false,
      error: message,
      stack: err.stack,
      details: details,
      internal: err
    });
  } else {
    // 本番用：ユーザーフレンドリーかつ安全なレスポンス
    // 500系（予期せぬエラー）はメッセージを丸める。400系（意図的なAppError）はそのまま。
    const safeMessage = statusCode >= 500 
      ? 'サーバー内部でエラーが発生しました。時間をおいて再度お試しください。' 
      : message;

    return res.status(statusCode).json({
      success: false,
      error: safeMessage,
      ...(details && { details }) // 400系バリデーション詳細などは本番でも返して良い
    });
  }
};