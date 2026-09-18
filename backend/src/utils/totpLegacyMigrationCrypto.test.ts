import crypto from 'crypto';
import { afterEach, describe, expect, it } from 'vitest';
import { decryptLegacyTotpSecretForMigration } from './totpLegacyMigrationCrypto';

const originalLegacyKey = process.env.TOTP_LEGACY_ENCRYPTION_KEY;

afterEach(() => {
  if (originalLegacyKey === undefined) delete process.env.TOTP_LEGACY_ENCRYPTION_KEY;
  else process.env.TOTP_LEGACY_ENCRYPTION_KEY = originalLegacyKey;
});

function encryptLegacy(secret: string, keySource: string): string {
  const iv = Buffer.alloc(12, 7);
  const key = crypto.createHash('sha256').update(`${keySource}:totp`).digest();
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  return `${iv.toString('base64')}:${cipher.getAuthTag().toString('base64')}:${encrypted.toString('base64')}`;
}

describe('旧TOTP移行専用復号', () => {
  it('明示的に渡された旧鍵だけで旧形式を復号する', () => {
    process.env.TOTP_LEGACY_ENCRYPTION_KEY = 'synthetic-legacy-jwt-key';
    expect(decryptLegacyTotpSecretForMigration(encryptLegacy('synthetic-totp-secret', 'synthetic-legacy-jwt-key')))
      .toBe('synthetic-totp-secret');
  });

  it('旧鍵がなければ停止する', () => {
    delete process.env.TOTP_LEGACY_ENCRYPTION_KEY;
    expect(() => decryptLegacyTotpSecretForMigration('a:b:c')).toThrow('TOTP_LEGACY_ENCRYPTION_KEY is not defined');
  });
});
