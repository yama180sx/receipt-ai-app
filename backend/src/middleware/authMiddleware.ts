import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/auth';
import logger from '../utils/logger';

/**
 * [Issue #51] JWT認証ミドルウェア
 * トークンの検証を行い、結果を req.user に格納します。
 */
export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logger.warn(`[AUTH] Missing Authorization Header: ${req.path}`);
    return res.status(401).json({ 
      success: false, 
      code: 'UNAUTHORIZED', 
      message: '認証が必要です' 
    });
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);

  if (!decoded) {
    logger.warn(`[AUTH] Invalid or Expired Token: ${req.path}`);
    return res.status(401).json({ 
      success: false, 
      code: 'TOKEN_INVALID_OR_EXPIRED', 
      message: 'セッションが切れたか、無効なトークンです' 
    });
  }

  // Requestオブジェクトを拡張して情報を保持 (anyキャストで型定義不足を回避)
  (req as any).user = decoded;
  
  next();
};