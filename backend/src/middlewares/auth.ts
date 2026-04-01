import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/auth';
import logger from '../utils/logger';

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logger.warn('[AUTH] 認証ヘッダーが不足しています');
    return res.status(401).json({ error: '認証が必要です' });
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);

  if (!decoded) {
    return res.status(401).json({ error: '無効なトークンです' });
  }

  // Requestオブジェクトにユーザー情報を紐付け（必要に応じて型拡張）
  (req as any).user = decoded;
  next();
};