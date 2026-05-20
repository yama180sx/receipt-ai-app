import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/auth';
import logger from '../utils/logger';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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

/**
 * [Issue #73] 管理者権限（Role）検証ミドルウェア
 * ※必ず authMiddleware の後ろに配置して使用すること。
 * ログインユーザーのIDからDBを引き、role === 'ADMIN' かどうかを判定します。
 */
export const isAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.id; 
    
    if (!userId) {
      return res.status(401).json({ success: false, message: 'ユーザー情報が取得できません' });
    }

    const user = await prisma.familyMember.findUnique({
      where: { id: userId },
      select: { role: true }
    });

    if (user?.role !== 'ADMIN') {
      logger.warn(`[AUTH] Forbidden Admin Access Attempt by User ID: ${userId}`);
      return res.status(403).json({ 
        success: false, 
        code: 'FORBIDDEN', 
        message: 'この操作を実行する権限がありません（管理者専用）' 
      });
    }

    next();
  } catch (error) {
    logger.error(`[AUTH] Admin Check Error:`, error);
    res.status(500).json({ success: false, message: '権限の確認中にエラーが発生しました' });
  }
};