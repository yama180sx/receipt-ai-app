import '../../test/mockReceiptQueue';

import { ProductClassificationCandidateSource } from '@prisma/client';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app';
import { prisma } from '../../utils/prismaClient';
import {
  ensureTestMemberPassword,
  getTenantBItemId,
  loginAsTestMember,
  shouldRunDbIntegration,
} from './helpers/integrationHelpers';

const app = createApp();
const familyGroupId = 1;
const memberId = 1;
let createdReceiptId: number | null = null;

async function createItemWithCandidate() {
  const milk = await prisma.productType.findUnique({ where: { code: 'milk' } });
  if (!milk) throw new Error('Product type milk is not seeded.');

  const receipt = await prisma.receipt.create({
    data: {
      familyGroupId,
      memberId,
      storeName: '候補API回帰テスト店',
      normalizedStoreName: '候補api回帰テスト店',
      date: new Date('2026-07-29T00:00:00.000Z'),
      totalAmount: 100,
      items: {
        create: {
          name: '候補API特濃牛乳',
          normalizedName: '候補api特濃牛乳',
          price: 100,
          quantity: 1,
          productClassificationCandidates: {
            create: {
              productTypeId: milk.id,
              source: ProductClassificationCandidateSource.HISTORY,
              matchedNormalizedName: '特濃牛乳',
              similarity: 0.8,
              rank: 1,
            },
          },
        },
      },
    },
    include: { items: true },
  });
  createdReceiptId = receipt.id;
  return receipt.items[0];
}

describe.skipIf(!shouldRunDbIntegration())('Product classification candidate API (#111-2)', () => {
  beforeAll(async () => {
    await ensureTestMemberPassword(memberId);
  });

  afterEach(async () => {
    if (createdReceiptId) await prisma.receipt.delete({ where: { id: createdReceiptId } });
    createdReceiptId = null;
  });

  it('returns saved candidates only for an item in the authenticated household', async () => {
    const item = await createItemWithCandidate();
    const token = await loginAsTestMember(app, memberId);

    const res = await request(app)
      .get(`/api/receipts/items/${item.id}/product-classification-candidates`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([
      expect.objectContaining({
        source: 'history',
        matchedNormalizedName: '特濃牛乳',
        similarity: 0.8,
        rank: 1,
        productType: expect.objectContaining({ code: 'milk' }),
      }),
    ]);
  });

  it('does not expose candidates for an item in another household', async () => {
    const token = await loginAsTestMember(app, memberId);
    const tenantBItemId = await getTenantBItemId();

    const res = await request(app)
      .get(`/api/receipts/items/${tenantBItemId}/product-classification-candidates`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });
});
