import '../../test/mockReceiptQueue';

import path from 'path';
import fs from 'fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app';
import { clearMockReceiptJobs, registerMockReceiptJob } from '../../test/mockJobStore';
import {
  ensureTestMemberPassword,
  getTenantBItemId,
  getTenantBReceiptWithImage,
  loginAsTestMember,
  shouldRunDbIntegration,
  TENANT_B_ADMIN_MEMBER_ID,
} from './helpers/integrationHelpers';
import { ensureTenantIsolationFixture } from './helpers/integrationFixtures';

const app = createApp();

describe.skipIf(!shouldRunDbIntegration())('Receipt API integration', () => {
  beforeAll(async () => {
    await ensureTestMemberPassword(1);
    await ensureTestMemberPassword(TENANT_B_ADMIN_MEMBER_ID);
    ensureTenantIsolationFixture();
  });

  afterAll(() => {
    clearMockReceiptJobs();
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
});

describe.skipIf(!shouldRunDbIntegration())('Tenant isolation (#93-1)', () => {
  beforeAll(async () => {
    await ensureTestMemberPassword(1);
    await ensureTestMemberPassword(TENANT_B_ADMIN_MEMBER_ID);
    ensureTenantIsolationFixture();
  });

  afterAll(() => {
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

  it('GET /receipts/jobs returns only logged-in member jobs', async () => {
    clearMockReceiptJobs();
    registerMockReceiptJob('member1-job', {
      memberId: 1,
      familyGroupId: 1,
      imagePath: 'uploads/member1.webp',
    }, { timestamp: 2000 });
    registerMockReceiptJob('member2-job', {
      memberId: 2,
      familyGroupId: 1,
      imagePath: 'uploads/member2.webp',
    }, { timestamp: 1000 });

    const tokenMember1 = await loginAsTestMember(app, 1);
    const res = await request(app)
      .get('/api/receipts/jobs')
      .set('Authorization', `Bearer ${tokenMember1}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].id).toBe('member1-job');
  });

  it('GET /receipts/jobs flags duplicateSuspected on completed jobs', async () => {
    clearMockReceiptJobs();
    registerMockReceiptJob('dup-job', {
      memberId: 1,
      familyGroupId: 1,
      imagePath: 'uploads/new-dup.webp',
    }, {
      returnvalue: {
        parsedData: {
          storeName: '山本家テスト店',
          purchaseDate: '2026-01-10',
          totalAmount: 100,
          items: [{ name: 'テスト商品', price: 100, quantity: 1 }],
        },
        imagePath: 'uploads/new-dup.webp',
        validation: { isSuspicious: false, warnings: [] },
      },
    });

    const token = await loginAsTestMember(app, 1);
    const res = await request(app)
      .get('/api/receipts/jobs')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    const job = res.body.data.find((j: { id: string }) => j.id === 'dup-job');
    expect(job).toBeDefined();
    expect(job.duplicateSuspected).toBe(true);
    expect(job.existingReceiptId).toBeGreaterThan(0);
    expect(job.parsedData.storeName).toBe('山本家テスト店');
  });

  it('getJobStatus enriches completed jobs with duplicate flags', async () => {
    registerMockReceiptJob('dup-status-job', {
      memberId: 1,
      familyGroupId: 1,
      imagePath: 'uploads/dup-status.webp',
    }, {
      returnvalue: {
        parsedData: {
          storeName: '山本家テスト店',
          purchaseDate: '2026-01-10',
          totalAmount: 100,
          items: [],
        },
        imagePath: 'uploads/dup-status.webp',
      },
    });

    const token = await loginAsTestMember(app, 1);
    const res = await request(app)
      .get('/api/receipts/status/dup-status-job')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.duplicateSuspected).toBe(true);
    expect(res.body.data.existingReceiptId).toBeGreaterThan(0);
  });

  it('DELETE /receipts/jobs/:jobId removes owned job', async () => {
    clearMockReceiptJobs();
    registerMockReceiptJob('discard-me', {
      memberId: 1,
      familyGroupId: 1,
      imagePath: 'uploads/discard-me.webp',
    });

    const token = await loginAsTestMember(app, 1);
    const del = await request(app)
      .delete('/api/receipts/jobs/discard-me')
      .set('Authorization', `Bearer ${token}`);

    expect(del.status).toBe(200);
    expect(del.body.success).toBe(true);

    const list = await request(app)
      .get('/api/receipts/jobs')
      .set('Authorization', `Bearer ${token}`);

    expect(list.body.data.find((j: { id: string }) => j.id === 'discard-me')).toBeUndefined();
  });

  it('DELETE /receipts/jobs rejects cross-member job', async () => {
    registerMockReceiptJob('other-member-job', {
      memberId: 2,
      familyGroupId: 1,
    });

    const token = await loginAsTestMember(app, 1);
    const res = await request(app)
      .delete('/api/receipts/jobs/other-member-job')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });

  it('rejects unauthenticated upload image access', async () => {
    const res = await request(app).get('/api/uploads/tenant-isolation-fixture.webp');
    expect(res.status).toBe(401);
  });

  it('allows same-tenant authenticated upload image access', async () => {
    const tokenA = await loginAsTestMember(app, 1);
    const { imagePath } = await getTenantBReceiptWithImage();
    const filename = path.basename(imagePath);

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

  it('allows pending job image access before receipt is saved', async () => {
    const pendingImagePath = 'uploads/pending-preview-fixture.webp';
    const fixturePath = path.join(process.cwd(), pendingImagePath);
    fs.mkdirSync(path.dirname(fixturePath), { recursive: true });
    fs.writeFileSync(fixturePath, Buffer.from('pending-preview-test'));

    registerMockReceiptJob('pending-preview-job', {
      memberId: 1,
      familyGroupId: 1,
      imagePath: pendingImagePath,
    });

    const token = await loginAsTestMember(app, 1);
    const res = await request(app)
      .get(`/api/uploads/${path.basename(pendingImagePath)}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
  });

  it('allows failed job image access before receipt is saved', async () => {
    const pendingImagePath = 'uploads/failed-preview-fixture.webp';
    const fixturePath = path.join(process.cwd(), pendingImagePath);
    fs.mkdirSync(path.dirname(fixturePath), { recursive: true });
    fs.writeFileSync(fixturePath, Buffer.from('failed-preview-test'));

    registerMockReceiptJob(
      'failed-preview-job',
      {
        memberId: 1,
        familyGroupId: 1,
        imagePath: pendingImagePath,
      },
      { state: 'failed', failedReason: 'Gemini quota exceeded' }
    );

    const token = await loginAsTestMember(app, 1);
    const res = await request(app)
      .get(`/api/uploads/${path.basename(pendingImagePath)}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
  });
});
