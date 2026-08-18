import '../../test/mockReceiptQueue';

import path from 'path';
import fs from 'fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app';
import { clearMockReceiptJobs, mockReceiptJobs, registerMockReceiptJob } from '../../test/mockJobStore';
import { prisma } from '../../utils/prismaClient';
import { getCleanText } from '../../utils/normalizer';
import { recoverReceiptAnalysisJobs } from '../../services/receiptJobService';
import { ReceiptAnalysisJobStatus } from '@prisma/client';
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
    expect(Array.isArray(res.body.data.items)).toBe(true);
    expect(typeof res.body.data.hasNext).toBe('boolean');
    expect(res.body.data.nextCursor === null || typeof res.body.data.nextCursor === 'string').toBe(true);
  });

  it('検索語で店舗名または明細名が類似する世帯内レシートだけを返す', async () => {
    const suffix = Date.now();
    const marker = `履歴検索牛乳${suffix}`;
    const storeName = `履歴検索店${suffix}`;
    const receipt = await prisma.receipt.create({
      data: {
        familyGroupId: 1,
        memberId: 1,
        storeName,
        normalizedStoreName: getCleanText(storeName),
        date: new Date('2026-07-31T00:00:00.000Z'),
        totalAmount: 180,
        items: {
          create: {
            name: marker,
            normalizedName: getCleanText(marker),
            price: 180,
            quantity: 1,
          },
        },
      },
    });

    try {
      const token = await loginAsTestMember(app);
      const res = await request(app)
        .get('/api/receipts')
        .query({ q: marker })
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.items.map((item: { id: number }) => item.id)).toContain(receipt.id);

      const storeRes = await request(app)
        .get('/api/receipts')
        .query({ q: storeName })
        .set('Authorization', `Bearer ${token}`);
      expect(storeRes.status).toBe(200);
      expect(storeRes.body.data.items.map((item: { id: number }) => item.id)).toContain(receipt.id);
    } finally {
      await prisma.receipt.delete({ where: { id: receipt.id } });
    }
  });

  it('returns a cursor page without loading all fuzzy search results', async () => {
    const suffix = Date.now();
    const marker = `ページ検索${suffix}`;
    const receipts = await Promise.all(
      Array.from({ length: 21 }, (_, index) => prisma.receipt.create({
        data: {
          familyGroupId: 1,
          memberId: 1,
          storeName: marker,
          normalizedStoreName: getCleanText(marker),
          date: new Date(`2026-07-30T00:${String(index).padStart(2, '0')}:00.000Z`),
          totalAmount: 100 + index,
          items: {
            create: {
              name: `${marker}-${index}`,
              normalizedName: getCleanText(`${marker}-${index}`),
              price: 100 + index,
              quantity: 1,
            },
          },
        },
      }))
    );

    try {
      const token = await loginAsTestMember(app);
      const first = await request(app)
        .get('/api/receipts')
        .query({ q: marker, limit: 20 })
        .set('Authorization', `Bearer ${token}`);

      expect(first.status).toBe(200);
      expect(first.body.data.items).toHaveLength(20);
      expect(first.body.data.hasNext).toBe(true);
      expect(typeof first.body.data.nextCursor).toBe('string');

      const second = await request(app)
        .get('/api/receipts')
        .query({ q: marker, limit: 20, cursor: first.body.data.nextCursor })
        .set('Authorization', `Bearer ${token}`);

      expect(second.status).toBe(200);
      expect(second.body.data.items).toHaveLength(1);
      expect(second.body.data.hasNext).toBe(false);
      expect(second.body.data.nextCursor).toBeNull();
      expect([...first.body.data.items, ...second.body.data.items].map((item: { id: number }) => item.id))
        .toEqual(receipts.sort((a, b) => b.date.getTime() - a.date.getTime() || b.id - a.id).map((item) => item.id));
    } finally {
      await prisma.receipt.deleteMany({ where: { id: { in: receipts.map((receipt) => receipt.id) } } });
    }
  });

  it('rejects invalid pagination inputs', async () => {
    const token = await loginAsTestMember(app);

    const limitRes = await request(app)
      .get('/api/receipts')
      .query({ limit: 51 })
      .set('Authorization', `Bearer ${token}`);
    expect(limitRes.status).toBe(400);
    expect(limitRes.body.message).toBe('InvalidLimit');

    const cursorRes = await request(app)
      .get('/api/receipts')
      .query({ cursor: 'invalid' })
      .set('Authorization', `Bearer ${token}`);
    expect(cursorRes.status).toBe(400);
    expect(cursorRes.body.message).toBe('InvalidCursor');

    const emptyCursorRes = await request(app)
      .get('/api/receipts')
      .query({ cursor: '' })
      .set('Authorization', `Bearer ${token}`);
    expect(emptyCursorRes.status).toBe(400);
    expect(emptyCursorRes.body.message).toBe('InvalidCursor');
  });

  it('returns one receipt by id for the current family group', async () => {
    const receipt = await prisma.receipt.create({
      data: {
        familyGroupId: 1,
        memberId: 1,
        storeName: '詳細取得店',
        normalizedStoreName: getCleanText('詳細取得店'),
        date: new Date('2026-08-01T00:00:00.000Z'),
        totalAmount: 500,
        items: {
          create: {
            name: '詳細取得品',
            normalizedName: getCleanText('詳細取得品'),
            price: 500,
            quantity: 1,
          },
        },
      },
    });

    try {
      const token = await loginAsTestMember(app);
      const res = await request(app)
        .get(`/api/receipts/${receipt.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(receipt.id);
      expect(res.body.data.items).toHaveLength(1);
    } finally {
      await prisma.receipt.delete({ where: { id: receipt.id } });
    }
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

  it('returns 404 for a receipt owned by another family group', async () => {
    const tenantBReceipt = await prisma.receipt.create({
      data: {
        familyGroupId: 2,
        memberId: TENANT_B_ADMIN_MEMBER_ID,
        storeName: '別世帯詳細取得店',
        normalizedStoreName: getCleanText('別世帯詳細取得店'),
        date: new Date('2026-08-01T00:00:00.000Z'),
        totalAmount: 500,
        items: {
          create: {
            name: '別世帯詳細取得品',
            normalizedName: getCleanText('別世帯詳細取得品'),
            price: 500,
            quantity: 1,
          },
        },
      },
    });
    const tokenA = await loginAsTestMember(app, 1);
    try {
      const res = await request(app)
        .get(`/api/receipts/${tenantBReceipt.id}`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('ReceiptNotFound');
    } finally {
      await prisma.receipt.delete({ where: { id: tenantBReceipt.id } });
    }
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

  it('復旧台帳からキューにない未完了ジョブを復元し、本人だけに公開する', async () => {
    clearMockReceiptJobs();
    const imagePath = 'uploads/ledger-recovery-fixture.webp';
    const fixturePath = path.join(process.cwd(), imagePath);
    fs.mkdirSync(path.dirname(fixturePath), { recursive: true });
    fs.writeFileSync(fixturePath, Buffer.from('ledger-recovery-test'));
    const ledger = await prisma.receiptAnalysisJob.create({
      data: {
        familyGroupId: 1,
        memberId: 1,
        imagePath,
        status: ReceiptAnalysisJobStatus.QUEUED,
      },
    });

    try {
      await recoverReceiptAnalysisJobs(true);
      expect(mockReceiptJobs.has(ledger.id)).toBe(true);

      const token = await loginAsTestMember(app, 1);
      const [status, jobs, image] = await Promise.all([
        request(app).get(`/api/receipts/status/${ledger.id}`).set('Authorization', `Bearer ${token}`),
        request(app).get('/api/receipts/jobs').set('Authorization', `Bearer ${token}`),
        request(app).get(`/api/uploads/${path.basename(imagePath)}`).set('Authorization', `Bearer ${token}`),
      ]);

      expect(status.status).toBe(200);
      expect(status.body.data.state).toBe('waiting');
      expect(jobs.body.data.some((job: { id: string }) => job.id === ledger.id)).toBe(true);
      expect(image.status).toBe(200);
    } finally {
      clearMockReceiptJobs();
      fs.unlinkSync(fixturePath);
      await prisma.receiptAnalysisJob.delete({ where: { id: ledger.id } });
    }
  });

  it('キューを失った失敗台帳は再実行可能性を返し、同じ jobId で再投入する', async () => {
    clearMockReceiptJobs();
    const imagePath = 'uploads/ledger-retry-fixture.webp';
    const fixturePath = path.join(process.cwd(), imagePath);
    fs.mkdirSync(path.dirname(fixturePath), { recursive: true });
    fs.writeFileSync(fixturePath, Buffer.from('ledger-retry-test'));
    const ledger = await prisma.receiptAnalysisJob.create({
      data: {
        familyGroupId: 1,
        memberId: 1,
        imagePath,
        status: ReceiptAnalysisJobStatus.FAILED,
        failureCode: 'gemini_daily_quota',
        failureReason: 'Quota: GenerateRequestsPerDayPerProjectPerModel-FreeTier',
      },
    });
    await prisma.receiptAnalysisJob.update({
      where: { id: ledger.id },
      data: { updatedAt: new Date('2026-08-15T07:00:00.000Z') },
    });

    try {
      const token = await loginAsTestMember(app, 1);
      const list = await request(app).get('/api/receipts/jobs').set('Authorization', `Bearer ${token}`);
      const item = list.body.data.find((job: { id: string }) => job.id === ledger.id);
      expect(item.retry).toMatchObject({ eligible: true, remainingCount: 1 });

      const retry = await request(app)
        .post(`/api/receipts/jobs/${ledger.id}/retry`)
        .set('Authorization', `Bearer ${token}`);
      expect(retry.status).toBe(200);
      expect(mockReceiptJobs.get(ledger.id)?.data.manualRetryCount).toBe(1);
      await expect(prisma.receiptAnalysisJob.findUnique({ where: { id: ledger.id } }))
        .resolves.toMatchObject({ status: ReceiptAnalysisJobStatus.QUEUED, manualRetryCount: 1 });
    } finally {
      clearMockReceiptJobs();
      fs.unlinkSync(fixturePath);
      await prisma.receiptAnalysisJob.delete({ where: { id: ledger.id } });
    }
  });

  it('計画メンテナンス中はアップロードと再実行を 503 で止める', async () => {
    const previous = process.env.RECEIPT_ANALYSIS_MAINTENANCE_MODE;
    process.env.RECEIPT_ANALYSIS_MAINTENANCE_MODE = 'true';
    try {
      const token = await loginAsTestMember(app, 1);
      const [upload, retry] = await Promise.all([
        request(app).post('/api/receipts/upload').set('Authorization', `Bearer ${token}`),
        request(app).post('/api/receipts/jobs/any-job/retry').set('Authorization', `Bearer ${token}`),
      ]);
      expect(upload.status).toBe(503);
      expect(retry.status).toBe(503);
      expect(upload.body.message).toContain('解析基盤を更新中');
    } finally {
      if (previous === undefined) delete process.env.RECEIPT_ANALYSIS_MAINTENANCE_MODE;
      else process.env.RECEIPT_ANALYSIS_MAINTENANCE_MODE = previous;
    }
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

  it('POST /receipts/jobs/:jobId/retry requeues an owned failed job with its existing image', async () => {
    clearMockReceiptJobs();
    const imagePath = 'uploads/retry-source.webp';
    fs.mkdirSync('uploads', { recursive: true });
    fs.writeFileSync(imagePath, 'fixture');
    registerMockReceiptJob('retry-source', {
      memberId: 1,
      familyGroupId: 1,
      imagePath,
      manualRetryCount: 0,
    }, {
      state: 'failed',
      failedReason: 'Quota: GenerateRequestsPerDayPerProjectPerModel-FreeTier',
      finishedOn: Date.parse('2026-08-15T07:00:00.000Z'),
    });

    try {
      const token = await loginAsTestMember(app, 1);
      const res = await request(app)
        .post('/api/receipts/jobs/retry-source/retry')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual({ jobId: 'retry-source', status: 'queued' });
      expect(mockReceiptJobs.has('retry-source')).toBe(true);
      expect(mockReceiptJobs.get('retry-source')?.data.imagePath).toBe(imagePath);
      expect(mockReceiptJobs.get('retry-source')?.data.manualRetryCount).toBe(1);
    } finally {
      fs.unlinkSync(imagePath);
    }
  });

  it('POST /receipts/jobs/:jobId/retry blocks a daily quota failure until the next RPD reset', async () => {
    const imagePath = 'uploads/retry-quota-wait.webp';
    fs.writeFileSync(imagePath, 'fixture');
    registerMockReceiptJob('retry-quota-wait', {
      memberId: 1,
      familyGroupId: 1,
      imagePath,
      manualRetryCount: 0,
    }, {
      state: 'failed',
      failedReason: 'Quota: GenerateRequestsPerDayPerProjectPerModel-FreeTier',
      finishedOn: Date.now(),
    });

    try {
      const token = await loginAsTestMember(app, 1);
      const res = await request(app)
        .post('/api/receipts/jobs/retry-quota-wait/retry')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(409);
      expect(res.body.message).toContain('日次無料枠が回復するまで');
      expect(mockReceiptJobs.has('retry-quota-wait')).toBe(true);
    } finally {
      fs.unlinkSync(imagePath);
    }
  });

  it('POST /receipts/jobs/:jobId/retry rejects a missing source image', async () => {
    registerMockReceiptJob('retry-missing-image', {
      memberId: 1,
      familyGroupId: 1,
      imagePath: 'uploads/missing-retry-source.webp',
    }, { state: 'failed' });

    const token = await loginAsTestMember(app, 1);
    const res = await request(app)
      .post('/api/receipts/jobs/retry-missing-image/retry')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(409);
  });

  it('POST /receipts/jobs/:jobId/retry rejects a job owned by another member', async () => {
    registerMockReceiptJob('retry-other-member', {
      memberId: 2,
      familyGroupId: 1,
      imagePath: 'uploads/other-member.webp',
    }, { state: 'failed' });

    const token = await loginAsTestMember(app, 1);
    const res = await request(app)
      .post('/api/receipts/jobs/retry-other-member/retry')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });

  it('POST /receipts/jobs/:jobId/retry rejects a daily quota job after the manual retry limit', async () => {
    const imagePath = 'uploads/retry-limit.webp';
    fs.writeFileSync(imagePath, 'fixture');
    registerMockReceiptJob('retry-limit', {
      memberId: 1,
      familyGroupId: 1,
      imagePath,
      manualRetryCount: 1,
    }, {
      state: 'failed',
      failedReason: 'Quota: GenerateRequestsPerDayPerProjectPerModel-FreeTier',
      finishedOn: Date.parse('2026-08-15T07:00:00.000Z'),
    });

    try {
      const token = await loginAsTestMember(app, 1);
      const res = await request(app)
        .post('/api/receipts/jobs/retry-limit/retry')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(409);
    } finally {
      fs.unlinkSync(imagePath);
    }
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
