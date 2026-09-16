import dotenv from 'dotenv';
import { beforeEach } from 'vitest';
import { resetRateLimiters } from './src/middleware/rateLimitMiddleware';

dotenv.config();

if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'vitest-local-secret';
}

if (!process.env.TOTP_ENCRYPTION_KEY) {
  process.env.TOTP_ENCRYPTION_KEY = 'vitest-local-totp-encryption-key';
}

// PrismaClient 生成時に必須（CI 等 .env なし環境向け。DB 未使用テストは接続しない）
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL =
    'postgresql://vitest:vitest@127.0.0.1:5432/vitest?schema=public';
}

// 同一NodeプロセスでHTTP結合テストを連続実行しても、前ケースの入口制限状態を持ち越さない。
beforeEach(() => {
  resetRateLimiters();
});
