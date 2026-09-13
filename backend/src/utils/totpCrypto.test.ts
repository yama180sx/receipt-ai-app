import crypto from 'crypto';
import { afterEach, describe, expect, it } from 'vitest';
import {
  CURRENT_TOTP_KEY_VERSION,
  LEGACY_TOTP_KEY_VERSION,
  decryptTotpSecret,
  encryptTotpSecret,
} from './totpCrypto';

const originalCurrentKey = process.env.TOTP_ENCRYPTION_KEY;
const originalLegacyKey = process.env.TOTP_LEGACY_ENCRYPTION_KEY;
const originalJwtKey = process.env.JWT_SECRET;

function setOrDelete(name: string, value: string | undefined) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

function encryptLegacyPayload(secret: string, legacyKey: string): string {
  const iv = Buffer.alloc(12, 7);
  const key = crypto.createHash('sha256').update(`${legacyKey}:totp`).digest();
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  return `${iv.toString('base64')}:${cipher.getAuthTag().toString('base64')}:${encrypted.toString('base64')}`;
}

afterEach(() => {
  setOrDelete('TOTP_ENCRYPTION_KEY', originalCurrentKey);
  setOrDelete('TOTP_LEGACY_ENCRYPTION_KEY', originalLegacyKey);
  setOrDelete('JWT_SECRET', originalJwtKey);
});

describe('TOTP暗号鍵の分離', () => {
  it('専用TOTP鍵で新規暗号化・復号する', () => {
    process.env.TOTP_ENCRYPTION_KEY = 'synthetic-current-totp-key';
    const encrypted = encryptTotpSecret('synthetic-totp-secret');

    expect(decryptTotpSecret(encrypted, CURRENT_TOTP_KEY_VERSION)).toBe('synthetic-totp-secret');
  });

  it('既存JWT由来の暗号文は明示した移行用鍵でだけ復号する', () => {
    const legacyKey = 'synthetic-legacy-jwt-key';
    process.env.TOTP_LEGACY_ENCRYPTION_KEY = legacyKey;
    const encrypted = encryptLegacyPayload('synthetic-legacy-totp-secret', legacyKey);

    expect(decryptTotpSecret(encrypted, LEGACY_TOTP_KEY_VERSION)).toBe('synthetic-legacy-totp-secret');
  });

  it('専用鍵がない場合、JWT鍵へ暗黙フォールバックしない', () => {
    delete process.env.TOTP_ENCRYPTION_KEY;
    process.env.JWT_SECRET = 'synthetic-jwt-key-must-not-be-used';

    expect(() => encryptTotpSecret('synthetic-totp-secret')).toThrow('TOTP_ENCRYPTION_KEY is not defined');
  });

  it('未知の鍵バージョンを拒否する', () => {
    expect(() => decryptTotpSecret('a:b:c', 'unknown-key-version')).toThrow('Unsupported TOTP key version');
  });
});
