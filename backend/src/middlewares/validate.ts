import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/appError';

/**
 * Zodバリデーションミドルウェア
 * エラー時は AppError を生成して共通エラーハンドラーへ渡す
 */
export const validate = (schema: any) => 
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // スキーマでパースして結果をreq.bodyに反映
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error: any) {
      // ZodErrorの判定と、issues/errorsプロパティの安全な取得
      const issues = error.issues || error.errors;

      if ((error instanceof ZodError || error.name === 'ZodError') && Array.isArray(issues)) {
        // 詳細なエラー内容を整形
        const details = issues.map((e: any) => ({
          field: Array.isArray(e.path) ? e.path.join('.') : 'unknown',
          message: e.message
        }));

        // 共通エラーハンドラーへ渡す。レスポンス生成とログ出力はあちらで一括処理。
        return next(new AppError('入力内容に不備があります', 400, details));
      }
      
      // バリデーション以外のエラー、または構造が想定外の場合はそのまま次へ
      next(error);
    }
  };