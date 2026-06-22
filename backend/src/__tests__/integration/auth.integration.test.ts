import '../../test/mockReceiptQueue';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app';
import { prisma } from '../../utils/prismaClient';
import { clearMockReceiptJobs } from '../../test/mockJobStore';
import {
  ensureTestMemberPassword,
  ensureTestMemberTotp,
  getTestTotpCode,
  loginAsTestMember,
  shouldRunDbIntegration,
  TENANT_B_ADMIN_MEMBER_ID,
} from './helpers/integrationHelpers';
import { ensureTenantIsolationFixture } from './helpers/integrationFixtures';

const app = createApp();

describe('API integration (no DB)', () => {
  it('GET /health returns ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('GET /api/receipts without auth returns 401', async () => {
    const res = await request(app).get('/api/receipts');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/auth/login without body returns 400', async () => {
    const res = await request(app).post('/api/auth/login').send({});
    expect(res.status).toBe(400);
  });

  it('GET /uploads without auth is not publicly served', async () => {
    const res = await request(app).get('/uploads/tenant-isolation-fixture.webp');
    expect(res.status).toBe(404);
  });
});

describe.skipIf(!shouldRunDbIntegration())('Auth API integration', () => {
  beforeAll(async () => {
    await ensureTestMemberPassword(1);
    await ensureTestMemberPassword(2);
    await ensureTestMemberPassword(TENANT_B_ADMIN_MEMBER_ID);
    await ensureTestMemberTotp(1);
    await ensureTestMemberTotp(2);
    await ensureTestMemberTotp(TENANT_B_ADMIN_MEMBER_ID);
    ensureTenantIsolationFixture();
  });

  afterAll(async () => {
    clearMockReceiptJobs();
    await prisma.$disconnect();
  });

  it('POST /api/auth/login succeeds with test password (admin TOTP verify)', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        familyGroupId: 1,
        memberId: 1,
        password: 'integration-test-password',
      });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.data.requiresTotpVerification).toBe(true);
    expect(loginRes.body.data.pendingToken).toBeDefined();

    const verifyRes = await request(app)
      .post('/api/auth/verify-totp')
      .set('Authorization', `Bearer ${loginRes.body.data.pendingToken}`)
      .send({ code: getTestTotpCode() });

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.data.token).toBeDefined();
    expect(verifyRes.body.data.member.familyGroupId).toBe(1);
  });

  describe('Auth API (#93-2)', () => {
    const YAMAMOTO_INVITE = 'YAMAMOTO-2026';
    const SATO_INVITE = 'SATO-2026';

    it('POST /api/auth/resolve-family returns family for valid invite code', async () => {
      const res = await request(app)
        .post('/api/auth/resolve-family')
        .send({ inviteCode: YAMAMOTO_INVITE });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual({ familyGroupId: 1, name: '山本家' });
    });

    it('POST /api/auth/resolve-family rejects unknown invite code', async () => {
      const res = await request(app)
        .post('/api/auth/resolve-family')
        .send({ inviteCode: 'INVALID-CODE' });

      expect(res.status).toBe(404);
    });

    it('GET members returns list when inviteCode matches family', async () => {
      const res = await request(app)
        .get('/api/auth/families/1/members')
        .query({ inviteCode: YAMAMOTO_INVITE });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(3);
      expect(res.body.data[0]).toMatchObject({ id: expect.any(Number), name: expect.any(String) });
      expect(res.body.data.some((m: { id: number }) => m.id === 1)).toBe(true);
    });

    it('GET members rejects mismatched inviteCode', async () => {
      const res = await request(app)
        .get('/api/auth/families/1/members')
        .query({ inviteCode: SATO_INVITE });

      expect(res.status).toBe(404);
    });

    it('full login flow: resolve → members → login', async () => {
      const resolved = await request(app)
        .post('/api/auth/resolve-family')
        .send({ inviteCode: SATO_INVITE });
      expect(resolved.status).toBe(200);
      const { familyGroupId } = resolved.body.data;

      const members = await request(app)
        .get(`/api/auth/families/${familyGroupId}/members`)
        .query({ inviteCode: SATO_INVITE });
      expect(members.status).toBe(200);
      const adminMember = members.body.data.find(
        (m: { id: number }) => m.id === TENANT_B_ADMIN_MEMBER_ID
      );
      expect(adminMember).toBeDefined();

      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          familyGroupId,
          memberId: adminMember.id,
          password: 'integration-test-password',
        });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body.data.requiresTotpVerification).toBe(true);

      const verifyRes = await request(app)
        .post('/api/auth/verify-totp')
        .set('Authorization', `Bearer ${loginRes.body.data.pendingToken}`)
        .send({ code: getTestTotpCode() });

      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.data.token).toBeDefined();
      expect(verifyRes.body.data.member.familyGroupId).toBe(2);
    });

    it('POST /api/auth/login rejects member from another family', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          familyGroupId: 1,
          memberId: TENANT_B_ADMIN_MEMBER_ID,
          password: 'integration-test-password',
        });

      expect(res.status).toBe(401);
    });

    it('POST /api/auth/login returns requiresTotpSetup for USER without TOTP', async () => {
      await prisma.familyMember.update({
        where: { id: 2 },
        data: { totpSecret: null, totpEnabled: false, totpVerifiedAt: null },
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          familyGroupId: 1,
          memberId: 2,
          password: 'integration-test-password',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.token).toBeNull();
      expect(res.body.data.requiresTotpSetup).toBe(true);
      expect(res.body.data.pendingToken).toBeDefined();
      expect(res.body.data.requiresTotpVerification).toBe(false);

      await ensureTestMemberTotp(2);
    });
  });

  describe('TOTP 2FA (#93-5)', () => {
    it('admin without TOTP gets requiresTotpSetup on login', async () => {
      await prisma.familyMember.update({
        where: { id: 1 },
        data: { totpSecret: null, totpEnabled: false, totpVerifiedAt: null },
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          familyGroupId: 1,
          memberId: 1,
          password: 'integration-test-password',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.requiresTotpSetup).toBe(true);
      expect(res.body.data.pendingToken).toBeDefined();
      expect(res.body.data.token).toBeNull();

      await ensureTestMemberTotp(1);
    });

    it('admin setup flow issues access token', async () => {
      await prisma.familyMember.update({
        where: { id: 1 },
        data: { totpSecret: null, totpEnabled: false, totpVerifiedAt: null },
      });

      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          familyGroupId: 1,
          memberId: 1,
          password: 'integration-test-password',
        });
      const pendingToken = loginRes.body.data.pendingToken;

      const setupRes = await request(app)
        .post('/api/auth/totp/setup')
        .set('Authorization', `Bearer ${pendingToken}`);
      expect(setupRes.status).toBe(200);
      const { secret } = setupRes.body.data;

      const { authenticator } = await import('otplib');
      const confirmRes = await request(app)
        .post('/api/auth/totp/confirm')
        .set('Authorization', `Bearer ${pendingToken}`)
        .send({ code: authenticator.generate(secret) });

      expect(confirmRes.status).toBe(200);
      expect(confirmRes.body.data.token).toBeDefined();

      await ensureTestMemberTotp(1);
    });

    it('blocks admin API when TOTP not enabled', async () => {
      await prisma.familyMember.update({
        where: { id: 1 },
        data: { totpSecret: null, totpEnabled: false, totpVerifiedAt: null },
      });

      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          familyGroupId: 1,
          memberId: 1,
          password: 'integration-test-password',
        });

      const setupRes = await request(app)
        .post('/api/auth/totp/setup')
        .set('Authorization', `Bearer ${loginRes.body.data.pendingToken}`);
      const { secret } = setupRes.body.data;
      const { authenticator } = await import('otplib');
      const confirmRes = await request(app)
        .post('/api/auth/totp/confirm')
        .set('Authorization', `Bearer ${loginRes.body.data.pendingToken}`)
        .send({ code: authenticator.generate(secret) });
      const token = confirmRes.body.data.token;

      await prisma.familyMember.update({
        where: { id: 1 },
        data: { totpEnabled: false },
      });

      const adminRes = await request(app)
        .get('/api/admin/prompts')
        .set('Authorization', `Bearer ${token}`);

      expect(adminRes.status).toBe(403);
      expect(adminRes.body.code).toBe('TOTP_REQUIRED');

      await ensureTestMemberTotp(1);
    });
  });

  describe('Admin tenant isolation (#93-4)', () => {
    it('admin prompts are scoped to own family', async () => {
      const tokenA = await loginAsTestMember(app, 1);
      const tokenB = await loginAsTestMember(app, TENANT_B_ADMIN_MEMBER_ID);

      const resA = await request(app)
        .get('/api/admin/prompts')
        .set('Authorization', `Bearer ${tokenA}`);
      const resB = await request(app)
        .get('/api/admin/prompts')
        .set('Authorization', `Bearer ${tokenB}`);

      expect(resA.status).toBe(200);
      expect(resB.status).toBe(200);
      expect(resA.body.data.length).toBeGreaterThan(0);
      expect(resB.body.data.length).toBeGreaterThan(0);
      expect(resA.body.data[0].familyGroupId).toBe(1);
      expect(resB.body.data[0].familyGroupId).toBe(2);
    });
  });
});
