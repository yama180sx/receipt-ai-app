import { authenticator } from 'otplib';
import { Role } from '@prisma/client';
import { encryptTotpSecret, decryptTotpSecret } from '../utils/totpCrypto';

const APP_NAME = 'ReceiptAI';

authenticator.options = { window: 1 };

export function generateTotpSecret(): string {
  return authenticator.generateSecret();
}

export function buildOtpauthUrl(memberName: string, secret: string): string {
  return authenticator.keyuri(memberName, APP_NAME, secret);
}

export function verifyTotpCode(secret: string, code: string): boolean {
  return authenticator.verify({ token: code, secret });
}

export function encryptSecretForStorage(secret: string): string {
  return encryptTotpSecret(secret);
}

export function decryptSecretFromStorage(encrypted: string): string {
  return decryptTotpSecret(encrypted);
}

/** Admin は 2FA 必須、USER は任意 */
export function isTotpRequiredForRole(role: Role): boolean {
  return role === Role.ADMIN;
}
