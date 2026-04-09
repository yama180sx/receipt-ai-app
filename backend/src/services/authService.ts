// backend/src/utils/auth.ts (または services/authService.ts)
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export const generateToken = (payload: object): string => {
  // 30年選手なら「有効期限」の重要性はご承知の通り。
  // ここでは 7日間（7d）などで署名します。
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
};

export const verifyToken = (token: string) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
};