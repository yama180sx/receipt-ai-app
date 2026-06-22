import { Request, Response, NextFunction } from 'express';
import type { ZodType } from 'zod';
import { ZodError } from 'zod';
import { zodErrorToAppError } from '../utils/zodError';

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
        return next(zodErrorToAppError(error));
      }

      next(error);
    }
  };
