import jwt from 'jsonwebtoken';
import logger from './logger';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';
const EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * [Issue #52] トークンのペイロード定義
 * familyGroupId を追加し、コントローラーと整合性を合わせました。
 */
export interface JWTPayload {
  memberId: number;
  familyGroupId: number; // ★追加
  name: string;
}

/**
 * トークンの生成
 */
export const generateToken = (payload: JWTPayload): string => {
  // ペイロードをオブジェクトリテラルに展開
  return jwt.sign({ ...payload }, JWT_SECRET as string, { 
    expiresIn: EXPIRES_IN as any 
  });
};

/**
 * トークンの検証
 */
export const verifyToken = (token: string): JWTPayload | null => {
  try {
    return jwt.verify(token, JWT_SECRET as string) as JWTPayload;
  } catch (error: any) {
    logger.error(`[AUTH] トークン検証失敗: ${error.message}`);
    return null;
  }
};