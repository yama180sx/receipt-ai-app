import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import logger from '../utils/logger';

export const validate = (schema: any) => 
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error: any) {
      // ZodErrorの判定と、issues/errorsプロパティの安全な取得
      const issues = error.issues || error.errors;

      if ((error instanceof ZodError || error.name === 'ZodError') && Array.isArray(issues)) {
        logger.warn(`[Validation Error]: ${JSON.stringify(issues)}`);
        
        return res.status(400).json({
          error: "入力内容に不備があります",
          details: issues.map((e: any) => ({
            field: Array.isArray(e.path) ? e.path.join('.') : 'unknown',
            message: e.message
          }))
        });
      }
      
      // バリデーション以外のエラー、または構造が想定外の場合はExpressのエラーハンドラへ
      next(error);
    }
  };