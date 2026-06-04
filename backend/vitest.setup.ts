import dotenv from 'dotenv';

dotenv.config();

if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'vitest-local-secret';
}

// PrismaClient 生成時に必須（CI 等 .env なし環境向け。DB 未使用テストは接続しない）
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL =
    'postgresql://vitest:vitest@127.0.0.1:5432/vitest?schema=public';
}
