import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';

/**
 * Issue #128の一回限りのデータ移行専用。
 * 通常の認証処理には公開せず、JWT_SECRETへの暗黙フォールバックも行わない。
 */
export function decryptLegacyTotpSecretForMigration(payload: string): string {
  const source = process.env.TOTP_LEGACY_ENCRYPTION_KEY;
  if (!source) {
    throw new Error('TOTP_LEGACY_ENCRYPTION_KEY is not defined for TOTP migration');
  }

  const [ivB64, tagB64, dataB64] = payload.split(':');
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error('Invalid encrypted TOTP secret format');
  }

  const key = crypto.createHash('sha256').update(`${source}:totp`).digest();
  const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()]).toString('utf8');
}
