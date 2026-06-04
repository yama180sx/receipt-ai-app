import './test/mockReceiptQueue';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from './app';
import {
  ensureTestMemberPassword,
  loginAsTestMember,
  shouldRunDbIntegration,
} from './test/integrationHelpers';
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
});

describe.skipIf(!shouldRunDbIntegration())('API integration (DATABASE_URL)', () => {
  beforeAll(async () => {
    await ensureTestMemberPassword(1);
  });

  afterAll(async () => {
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
