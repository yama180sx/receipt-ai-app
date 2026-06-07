import './test/mockReceiptQueue';

import fs from 'fs';
import path from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from './app';
import {
  ensureTestMemberPassword,
  getTenantBItemId,
  getTenantBCategoryId,
  getTenantBReceiptWithImage,
  loginAsTestMember,
  shouldRunDbIntegration,
  TENANT_B_ADMIN_MEMBER_ID,
} from './test/integrationHelpers';
import { clearMockReceiptJobs, registerMockReceiptJob } from './test/mockJobStore';
import { prisma } from './utils/prismaClient';

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

describe.skipIf(!shouldRunDbIntegration())('API integration (DATABASE_URL)', () => {
  beforeAll(async () => {
    await ensureTestMemberPassword(1);
    await ensureTestMemberPassword(TENANT_B_ADMIN_MEMBER_ID);

    const fixturePath = path.join(process.cwd(), 'uploads', 'tenant-isolation-fixture.webp');
    fs.mkdirSync(path.dirname(fixturePath), { recursive: true });
    if (!fs.existsSync(fixturePath)) {
      fs.writeFileSync(fixturePath, Buffer.from('tenant-isolation-test-image'));
    }
  });

  afterAll(async () => {
    clearMockReceiptJobs();
    await prisma.$disconnect();
  });

  it('POST /api/auth/login succeeds with test password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ memberId: 1, password: 'integration-test-password' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.member.familyGroupId).toBeDefined();
  });

  it('GET /api/receipts with token returns success envelope', async () => {
    const token = await loginAsTestMember(app);
    const res = await request(app)
      .get('/api/receipts')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('GET /api/categories with token returns categories', async () => {
    const token = await loginAsTestMember(app);
    const res = await request(app)
      .get('/api/categories')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

describe.skipIf(!shouldRunDbIntegration())('Tenant isolation (#93-1)', () => {
  beforeAll(async () => {
    await ensureTestMemberPassword(1);
    await ensureTestMemberPassword(TENANT_B_ADMIN_MEMBER_ID);

    const fixturePath = path.join(process.cwd(), 'uploads', 'tenant-isolation-fixture.webp');
    fs.mkdirSync(path.dirname(fixturePath), { recursive: true });
    if (!fs.existsSync(fixturePath)) {
      fs.writeFileSync(fixturePath, Buffer.from('tenant-isolation-test-image'));
    }
  });

  afterAll(async () => {
    clearMockReceiptJobs();
  });

  it('rejects cross-tenant updateItemCategory', async () => {
    const tokenA = await loginAsTestMember(app, 1);
    const tenantBItemId = await getTenantBItemId();

    const res = await request(app)
      .patch(`/api/receipts/items/${tenantBItemId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ categoryId: 2 });

    expect(res.status).toBe(404);
  });

  it('rejects cross-tenant getJobStatus', async () => {
    registerMockReceiptJob('cross-tenant-job', {
      memberId: TENANT_B_ADMIN_MEMBER_ID,
      familyGroupId: 2,
    });

    const tokenA = await loginAsTestMember(app, 1);
    const res = await request(app)
      .get('/api/receipts/status/cross-tenant-job')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(404);
  });

  it('allows same-tenant getJobStatus', async () => {
    registerMockReceiptJob('same-tenant-job', {
      memberId: 1,
      familyGroupId: 1,
    });

    const tokenA = await loginAsTestMember(app, 1);
    const res = await request(app)
      .get('/api/receipts/status/same-tenant-job')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.state).toBe('completed');
  });

  it('rejects unauthenticated upload image access', async () => {
    const res = await request(app).get('/api/uploads/tenant-isolation-fixture.webp');
    expect(res.status).toBe(401);
  });

  it('allows same-tenant authenticated upload image access', async () => {
    const tokenA = await loginAsTestMember(app, 1);
    const { imagePath } = await getTenantBReceiptWithImage();
    const filename = path.basename(imagePath);

    // 山本家トークンでは佐藤家の画像は 404
    const denied = await request(app)
      .get(`/api/uploads/${filename}`)
      .set('Authorization', `Bearer ${tokenA}`);
    expect(denied.status).toBe(404);

    const tokenB = await loginAsTestMember(app, TENANT_B_ADMIN_MEMBER_ID);
    const allowed = await request(app)
      .get(`/api/uploads/${filename}`)
      .set('Authorization', `Bearer ${tokenB}`);
    expect(allowed.status).toBe(200);
  });
});

describe.skipIf(!shouldRunDbIntegration())('Master tenant isolation (#93-4)', () => {
  beforeAll(async () => {
    await ensureTestMemberPassword(1);
    await ensureTestMemberPassword(TENANT_B_ADMIN_MEMBER_ID);
  });

  it('returns only own family categories', async () => {
    const tokenA = await loginAsTestMember(app, 1);
    const tokenB = await loginAsTestMember(app, TENANT_B_ADMIN_MEMBER_ID);

    const resA = await request(app)
      .get('/api/categories')
      .set('Authorization', `Bearer ${tokenA}`);
    const resB = await request(app)
      .get('/api/categories')
      .set('Authorization', `Bearer ${tokenB}`);

    expect(resA.status).toBe(200);
    expect(resB.status).toBe(200);
    expect(resA.body.data).toHaveLength(10);
    expect(resB.body.data).toHaveLength(10);

    const idsA = resA.body.data.map((c: { id: number }) => c.id);
    const idsB = resB.body.data.map((c: { id: number }) => c.id);
    expect(idsA.some((id: number) => idsB.includes(id))).toBe(false);
  });

  it('rejects cross-tenant category delete', async () => {
    const tenantBCategoryId = await getTenantBCategoryId();
    const tokenA = await loginAsTestMember(app, 1);

    const res = await request(app)
      .delete(`/api/categories/${tenantBCategoryId}`)
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(404);
  });

  it('rejects cross-tenant item category assignment', async () => {
    const tokenA = await loginAsTestMember(app, 1);
    const tenantBCategoryId = await getTenantBCategoryId();

    const ownReceipt = await request(app)
      .get('/api/receipts')
      .set('Authorization', `Bearer ${tokenA}`);
    const ownItemId = ownReceipt.body.data?.[0]?.items?.[0]?.id;
    if (!ownItemId) return;

    const res = await request(app)
      .patch(`/api/receipts/items/${ownItemId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ categoryId: tenantBCategoryId });

    expect(res.status).toBe(404);
  });

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
