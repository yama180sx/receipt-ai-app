import { authenticator } from 'otplib';
import { Role } from '@prisma/client';
import {
  CURRENT_TOTP_KEY_VERSION,
  encryptTotpSecret,
  decryptTotpSecret,
} from '../utils/totpCrypto';

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

export function encryptSecretForStorage(secret: string): {
  encryptedSecret: string;
  keyVersion: string;
} {
  return {
    encryptedSecret: encryptTotpSecret(secret),
    keyVersion: CURRENT_TOTP_KEY_VERSION,
  };
}

export function decryptSecretFromStorage(encrypted: string, keyVersion: string | null): string {
  if (!keyVersion) {
    throw new Error('TOTP key version is unavailable');
  }
  return decryptTotpSecret(encrypted, keyVersion);
}

/** 全メンバーで初回ログイン時に 2FA セットアップ必須 */
export function isTotpRequiredForRole(_role: Role): boolean {
  return true;
}
