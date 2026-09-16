import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
export const CURRENT_TOTP_KEY_VERSION = 'totp-v1';

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

function getDecryptionKey(keyVersion: string): Buffer {
  if (keyVersion !== CURRENT_TOTP_KEY_VERSION) {
    throw new Error('Unsupported TOTP key version');
  }
  return getCurrentEncryptionKey();
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
