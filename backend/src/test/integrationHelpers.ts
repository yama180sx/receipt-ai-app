import bcrypt from 'bcrypt';
import request from 'supertest';
import type { Express } from 'express';
import { prisma } from '../utils/prismaClient';

export const TEST_MEMBER_PASSWORD = 'integration-test-password';

/** `RUN_API_INTEGRATION=1` 時のみ DB 結合テストを実行（compose 内や CI 向け） */
export function shouldRunDbIntegration(): boolean {
  return (
    process.env.RUN_API_INTEGRATION === '1' &&
    Boolean(process.env.DATABASE_URL && process.env.JWT_SECRET)
  );
}

/** 既存 DB の member にテスト用パスワードを設定（seed 済み環境向け） */
export async function ensureTestMemberPassword(memberId = 1): Promise<void> {
  const hash = await bcrypt.hash(TEST_MEMBER_PASSWORD, 4);
  const member = await prisma.familyMember.findUnique({ where: { id: memberId } });
  if (!member) {
    throw new Error(`Test member id=${memberId} not found. Run prisma seed first.`);
  }
  await prisma.familyMember.update({
    where: { id: memberId },
    data: { password_hash: hash },
  });
}

export async function loginAsTestMember(app: Express, memberId = 1): Promise<string> {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ memberId, password: TEST_MEMBER_PASSWORD });

  if (res.status !== 200 || !res.body?.success || !res.body?.data?.token) {
    throw new Error(`Login failed: status=${res.status} body=${JSON.stringify(res.body)}`);
  }
  return res.body.data.token as string;
}
