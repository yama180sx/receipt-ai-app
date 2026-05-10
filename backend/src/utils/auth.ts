import jwt from 'jsonwebtoken';
import logger from './logger';

// [Issue #69] 環境変数の必須化と安全性の向上
const JWT_SECRET = process.env.JWT_SECRET;
const EXPIRES_IN = process.env.JWT_EXPIRES_IN || '30d';

// 起動時に秘密鍵の存在を保証する
if (!JWT_SECRET) {
  const errorMsg = 'FATAL: JWT_SECRET is not defined in environment variables.';
  logger.error(`[AUTH] ${errorMsg}`);
  throw new Error(errorMsg);
}

/**
 * [Issue #52] トークンのペイロード定義
 * familyGroupId を含み、マルチテナント対応の基盤となります。
 */
export interface JWTPayload {
  memberId: number;
  familyGroupId: number;
  name: string;
}

/**
 * トークンの生成
 */
export const generateToken = (payload: JWTPayload): string => {
  // ペイロードを展開して署名
  return jwt.sign({ ...payload }, JWT_SECRET, { 
    expiresIn: EXPIRES_IN as any 
  });
};

/**
 * トークンの検証
 */
export const verifyToken = (token: string): JWTPayload | null => {
  try {
    // 署名の検証
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error: any) {
    // 期限切れや改ざんをログに記録
    logger.error(`[AUTH] トークン検証失敗: ${error.message}`);
    return null;
  }
};