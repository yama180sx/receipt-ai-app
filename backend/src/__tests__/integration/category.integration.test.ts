import '../../test/mockReceiptQueue';

import { beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app';
import {
  ensureTestMemberPassword,
  getTenantBCategoryId,
  loginAsTestMember,
  shouldRunDbIntegration,
  TENANT_B_ADMIN_MEMBER_ID,
} from './helpers/integrationHelpers';

const app = createApp();

describe.skipIf(!shouldRunDbIntegration())('Category API integration', () => {
  beforeAll(async () => {
    await ensureTestMemberPassword(1);
    await ensureTestMemberPassword(TENANT_B_ADMIN_MEMBER_ID);
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

describe.skipIf(!shouldRunDbIntegration())('Category tenant isolation (#93-4)', () => {
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
});
