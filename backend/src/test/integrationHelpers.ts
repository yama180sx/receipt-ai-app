import bcrypt from 'bcrypt';
import { authenticator } from 'otplib';
import request from 'supertest';
import type { Express } from 'express';
import { prisma } from '../utils/prismaClient';
import { encryptSecretForStorage } from '../services/totpService';
import { Role } from '@prisma/client';

export const TEST_MEMBER_PASSWORD = 'integration-test-password';
/** 結合テスト用固定 TOTP シークレット（base32） */
export const TEST_TOTP_SECRET = 'JBSWY3DPEHPK3PXP';

export function getTestTotpCode(): string {
  return authenticator.generate(TEST_TOTP_SECRET);
}

export function shouldRunDbIntegration(): boolean {
  return (
    process.env.RUN_API_INTEGRATION === '1' &&
    Boolean(process.env.DATABASE_URL && process.env.JWT_SECRET)
  );
}

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

/** Admin 結合テスト用: 既知シークレットで TOTP を有効化 */
export async function ensureTestAdminTotp(memberId: number): Promise<void> {
  const member = await prisma.familyMember.findUnique({ where: { id: memberId } });
  if (!member) {
    throw new Error(`Test member id=${memberId} not found.`);
  }
  if (member.role !== Role.ADMIN) return;
  if (member.totpEnabled) return;

  await prisma.familyMember.update({
    where: { id: memberId },
    data: {
      totpSecret: encryptSecretForStorage(TEST_TOTP_SECRET),
      totpEnabled: true,
      totpVerifiedAt: new Date(),
    },
  });
}

async function completeTotpLogin(app: Express, loginBody: Record<string, unknown>): Promise<string> {
  const loginRes = await request(app).post('/api/auth/login').send(loginBody);
  if (loginRes.status !== 200 || !loginRes.body?.success) {
    throw new Error(`Login failed: ${JSON.stringify(loginRes.body)}`);
  }

  const data = loginRes.body.data;
  if (data.token) {
    return data.token as string;
  }

  const pendingToken = data.pendingToken as string;

  if (data.requiresTotpSetup) {
    await request(app)
      .post('/api/auth/totp/setup')
      .set('Authorization', `Bearer ${pendingToken}`);
    const confirmRes = await request(app)
      .post('/api/auth/totp/confirm')
      .set('Authorization', `Bearer ${pendingToken}`)
      .send({ code: getTestTotpCode() });
    if (confirmRes.status !== 200 || !confirmRes.body?.data?.token) {
      throw new Error(`TOTP setup failed: ${JSON.stringify(confirmRes.body)}`);
    }
    return confirmRes.body.data.token as string;
  }

  if (data.requiresTotpVerification) {
    const verifyRes = await request(app)
      .post('/api/auth/verify-totp')
      .set('Authorization', `Bearer ${pendingToken}`)
      .send({ code: getTestTotpCode() });
    if (verifyRes.status !== 200 || !verifyRes.body?.data?.token) {
      throw new Error(`TOTP verify failed: ${JSON.stringify(verifyRes.body)}`);
    }
    return verifyRes.body.data.token as string;
  }

  throw new Error(`Unexpected login response: ${JSON.stringify(data)}`);
}

export async function loginAsTestMember(app: Express, memberId = 1): Promise<string> {
  const member = await prisma.familyMember.findUnique({
    where: { id: memberId },
    select: { familyGroupId: true, role: true },
  });
  if (!member) {
    throw new Error(`Test member id=${memberId} not found. Run prisma seed first.`);
  }

  if (member.role === Role.ADMIN) {
    await ensureTestAdminTotp(memberId);
  }

  return completeTotpLogin(app, {
    familyGroupId: member.familyGroupId,
    memberId,
    password: TEST_MEMBER_PASSWORD,
  });
}

export const TENANT_B_ADMIN_MEMBER_ID = 4;

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

export async function getTenantBCategoryId(name = '食費'): Promise<number> {
  const category = await prisma.category.findFirst({
    where: { familyGroupId: 2, name },
    select: { id: true },
  });
  if (!category) {
    throw new Error(`Tenant B category "${name}" not found. Run prisma seed.`);
  }
  return category.id;
}

export async function countCategoriesForFamily(familyGroupId: number): Promise<number> {
  return prisma.category.count({ where: { familyGroupId } });
}

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
