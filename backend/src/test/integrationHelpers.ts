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

/** 第2世帯（佐藤家）のテスト用メンバー ID */
export const TENANT_B_ADMIN_MEMBER_ID = 4;

/** 他世帯の Item ID を DB から取得（seed 済み前提） */
export async function getTenantBItemId(): Promise<number> {
  const item = await prisma.item.findFirst({
    where: { receipt: { familyGroupId: 2 } },
    select: { id: true },
  });
  if (!item) {
    throw new Error('Tenant B fixture item not found. Run prisma seed.');
  }
  return item.id;
}

/** 他世帯の Receipt ID（画像 fixture 用） */
export async function getTenantBReceiptWithImage(): Promise<{ id: number; imagePath: string }> {
  const receipt = await prisma.receipt.findFirst({
    where: { familyGroupId: 2, imagePath: { not: null } },
    select: { id: true, imagePath: true },
  });
  if (!receipt?.imagePath) {
    throw new Error('Tenant B fixture receipt not found. Run prisma seed.');
  }
  return { id: receipt.id, imagePath: receipt.imagePath };
}
