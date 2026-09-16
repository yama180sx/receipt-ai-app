import { afterEach, describe, expect, it } from 'vitest';
import {
  CURRENT_TOTP_KEY_VERSION,
  decryptTotpSecret,
  encryptTotpSecret,
} from './totpCrypto';

const originalCurrentKey = process.env.TOTP_ENCRYPTION_KEY;
const originalJwtKey = process.env.JWT_SECRET;

function setOrDelete(name: string, value: string | undefined) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

afterEach(() => {
  setOrDelete('TOTP_ENCRYPTION_KEY', originalCurrentKey);
  setOrDelete('JWT_SECRET', originalJwtKey);
});

describe('TOTP暗号鍵の分離', () => {
  it('専用TOTP鍵で新規暗号化・復号する', () => {
    process.env.TOTP_ENCRYPTION_KEY = 'synthetic-current-totp-key';
    const encrypted = encryptTotpSecret('synthetic-totp-secret');

    expect(decryptTotpSecret(encrypted, CURRENT_TOTP_KEY_VERSION)).toBe('synthetic-totp-secret');
  });

  it('専用鍵がない場合、JWT鍵へ暗黙フォールバックしない', () => {
    delete process.env.TOTP_ENCRYPTION_KEY;
    process.env.JWT_SECRET = 'synthetic-jwt-key-must-not-be-used';

    expect(() => encryptTotpSecret('synthetic-totp-secret')).toThrow('TOTP_ENCRYPTION_KEY is not defined');
  });

  it('移行完了後は旧方式を含む非現行鍵バージョンを拒否する', () => {
    expect(() => decryptTotpSecret('a:b:c', 'totp-old-v1')).toThrow('Unsupported TOTP key version');
    expect(() => decryptTotpSecret('a:b:c', 'unknown-key-version')).toThrow('Unsupported TOTP key version');
  });
});
