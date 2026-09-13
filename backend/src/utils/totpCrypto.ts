import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
export const CURRENT_TOTP_KEY_VERSION = 'totp-v1';
export const LEGACY_TOTP_KEY_VERSION = 'totp-old-v1';

function deriveEncryptionKey(source: string, keyVersion: string): Buffer {
  return crypto.createHash('sha256').update(`${source}:totp:${keyVersion}`).digest();
}

function getCurrentEncryptionKey(): Buffer {
  const source = process.env.TOTP_ENCRYPTION_KEY;
  if (!source) {
    throw new Error('TOTP_ENCRYPTION_KEY is not defined');
  }
  return deriveEncryptionKey(source, CURRENT_TOTP_KEY_VERSION);
}

function getLegacyEncryptionKey(): Buffer {
  const source = process.env.TOTP_LEGACY_ENCRYPTION_KEY;
  if (!source) {
    throw new Error('TOTP_LEGACY_ENCRYPTION_KEY is not defined for legacy TOTP data');
  }
  // Issue #131-4以前の暗号文は、JWT_SECRETから `${source}:totp` を導出していた。
  return crypto.createHash('sha256').update(`${source}:totp`).digest();
}

function getDecryptionKey(keyVersion: string): Buffer {
  switch (keyVersion) {
    case CURRENT_TOTP_KEY_VERSION:
      return getCurrentEncryptionKey();
    case LEGACY_TOTP_KEY_VERSION:
      return getLegacyEncryptionKey();
    default:
      throw new Error('Unsupported TOTP key version');
  }
}

export function encryptTotpSecret(secret: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, getCurrentEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
}

export function decryptTotpSecret(payload: string, keyVersion: string): string {
  const [ivB64, tagB64, dataB64] = payload.split(':');
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error('Invalid encrypted TOTP secret format');
  }
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    getDecryptionKey(keyVersion),
    Buffer.from(ivB64, 'base64')
  );
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataB64, 'base64')),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}
