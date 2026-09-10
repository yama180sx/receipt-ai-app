/**
 * 起動失敗時に、秘密値・ファイルパス・生の例外本文を出さずに運用上の分類だけを返す。
 */
export type StartupFailureCode =
  | 'SECRET_FILE_UNAVAILABLE'
  | 'JWT_SECRET_UNAVAILABLE'
  | 'TOTP_SECRET_UNAVAILABLE'
  | 'GEMINI_MODEL_INVALID'
  | 'DATABASE_CONFIGURATION_INVALID'
  | 'RUNTIME_DEPENDENCY_LOAD_FAILED';

export function getStartupFailureCode(error: unknown): StartupFailureCode {
  const message = error instanceof Error ? error.message : '';

  if (message.includes('Secret file for ')) return 'SECRET_FILE_UNAVAILABLE';
  if (message.includes('TOTP encryption')) return 'TOTP_SECRET_UNAVAILABLE';
  if (message.includes('JWT_SECRET')) return 'JWT_SECRET_UNAVAILABLE';
  if (message.includes('GEMINI_RECEIPT_MODEL') || message.includes('GEMINI_PRODUCT_CLASSIFICATION_MODEL')) {
    return 'GEMINI_MODEL_INVALID';
  }
  if (message.includes('DATABASE_URL') || message.includes('datasource')) {
    return 'DATABASE_CONFIGURATION_INVALID';
  }

  return 'RUNTIME_DEPENDENCY_LOAD_FAILED';
}
