import jwt from 'jsonwebtoken';
import logger from './logger';

const JWT_SECRET = process.env.JWT_SECRET;
const EXPIRES_IN = process.env.JWT_EXPIRES_IN || '30d';
const PENDING_EXPIRES_IN = '10m';

if (!JWT_SECRET) {
  const errorMsg = 'FATAL: JWT_SECRET is not defined in environment variables.';
  logger.error(`[AUTH] ${errorMsg}`);
  throw new Error(errorMsg);
}

export type TokenPurpose = 'access' | 'totp_pending' | 'totp_setup';

export interface JWTPayload {
  id: number;
  memberId: number;
  familyGroupId: number;
  name: string;
  role?: string;
  purpose?: TokenPurpose;
}

type MemberTokenInput = {
  id: number;
  name: string;
  familyGroupId: number;
  role: string;
};

function toPayload(member: MemberTokenInput, purpose: TokenPurpose): JWTPayload {
  return {
    id: member.id,
    memberId: member.id,
    familyGroupId: member.familyGroupId,
    name: member.name,
    role: member.role,
    purpose,
  };
}

export function generateAccessToken(member: MemberTokenInput): string {
  return jwt.sign(toPayload(member, 'access'), JWT_SECRET, {
    expiresIn: EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

export function generatePendingToken(
  member: MemberTokenInput,
  purpose: 'totp_pending' | 'totp_setup'
): string {
  return jwt.sign(toPayload(member, purpose), JWT_SECRET, {
    expiresIn: PENDING_EXPIRES_IN,
  });
}

/** @deprecated generateAccessToken を使用 */
export const generateToken = generateAccessToken;

export function getTokenPurpose(payload: JWTPayload): TokenPurpose {
  return payload.purpose ?? 'access';
}

export function verifyToken(
  token: string,
  allowedPurposes: TokenPurpose[] = ['access']
): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    const purpose = getTokenPurpose(decoded);
    if (!allowedPurposes.includes(purpose)) {
      logger.warn(`[AUTH] Token purpose mismatch: expected ${allowedPurposes.join('|')}, got ${purpose}`);
      return null;
    }
    return decoded;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`[AUTH] トークン検証失敗: ${message}`);
    return null;
  }
}
