import { Request, Response, NextFunction } from 'express';
import { TokenPurpose, verifyToken } from '../utils/auth';
import logger from '../utils/logger';

export function pendingAuthMiddleware(...allowedPurposes: TokenPurpose[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: '認証が必要です' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token, allowedPurposes);
    if (!decoded) {
      logger.warn(`[AUTH] Invalid pending token: ${req.path}`);
      return res.status(401).json({ success: false, message: 'セッションが無効です。再度ログインしてください。' });
    }

    (req as Request & { user: typeof decoded }).user = decoded;
    next();
  };
}
