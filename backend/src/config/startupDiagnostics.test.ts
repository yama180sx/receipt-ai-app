import { describe, expect, it } from 'vitest';
import { getStartupFailureCode } from './startupDiagnostics';

describe('getStartupFailureCode', () => {
  it('classifies an unreadable secret file without returning its value', () => {
    const secret = 'synthetic-secret-value';
    const error = new Error(`Secret file for JWT_SECRET could not be read: ${secret}`);

    const code = getStartupFailureCode(error);

    expect(code).toBe('SECRET_FILE_UNAVAILABLE');
    expect(code).not.toContain(secret);
  });

  it('classifies the known non-secret startup configuration categories', () => {
    expect(getStartupFailureCode(new Error('JWT_SECRET is not defined'))).toBe('JWT_SECRET_UNAVAILABLE');
    expect(getStartupFailureCode(new Error('TOTP encryption requires JWT_SECRET or TOTP_ENCRYPTION_KEY'))).toBe('TOTP_SECRET_UNAVAILABLE');
    expect(getStartupFailureCode(new Error('GEMINI_RECEIPT_MODEL must use a fixed Gemini model ID'))).toBe('GEMINI_MODEL_INVALID');
    expect(getStartupFailureCode(new Error('Environment variable not found: DATABASE_URL'))).toBe('DATABASE_CONFIGURATION_INVALID');
  });

  it('uses a generic safe code for an unknown import failure', () => {
    expect(getStartupFailureCode(new Error('unexpected failure'))).toBe('RUNTIME_DEPENDENCY_LOAD_FAILED');
    expect(getStartupFailureCode('unexpected failure')).toBe('RUNTIME_DEPENDENCY_LOAD_FAILED');
  });
});
