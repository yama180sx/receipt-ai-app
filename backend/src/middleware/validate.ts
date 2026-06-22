import { Request, Response, NextFunction } from 'express';
import { ZodError, type ZodType } from 'zod';
import { AppError } from '../utils/appError';

/**
 * Zodバリデーションミドルウェア
 * エラー時は AppError を生成して共通エラーハンドラーへ渡す
 */
export const validate = (schema: ZodType) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        const details = error.issues.map((issue) => ({
          field: issue.path.join('.') || 'unknown',
          message: issue.message,
        }));

        return next(new AppError('入力内容に不備があります', 400, details));
      }

      next(error);
    }
  };
