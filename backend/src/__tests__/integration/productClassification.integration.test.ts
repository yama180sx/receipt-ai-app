import '../../test/mockReceiptQueue';

import { ClassificationCorrectionScope, ClassificationSource, ProductTypeStatus } from '@prisma/client';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app';
import { prisma } from '../../utils/prismaClient';
import { getCleanText } from '../../utils/normalizer';
import { classifyItemByExactMatch } from '../../services/productClassification/productClassificationService';
import {
  ensureTestMemberPassword,
  getTenantBItemId,
  loginAsTestMember,
  shouldRunDbIntegration,
} from './helpers/integrationHelpers';

const app = createApp();
const familyGroupId = 1;
const memberId = 1;
const learningNames = ['分類回帰OCR商品', '牛乳'];
let createdReceiptId: number | null = null;

async function createTestItem(name: string) {
  const receipt = await prisma.receipt.create({
    data: {
      familyGroupId,
      memberId,
      storeName: '商品分類回帰テスト店',
      date: new Date('2026-07-29T00:00:00.000Z'),
      totalAmount: 100,
      items: { create: { name, price: 100, quantity: 1 } },
    },
    include: { items: true },
  });
  createdReceiptId = receipt.id;
  return receipt.items[0];
}

async function productTypeIdByCode(code: string) {
  const productType = await prisma.productType.findUnique({ where: { code }, select: { id: true } });
  if (!productType) throw new Error(`Product type ${code} is not seeded.`);
  return productType.id;
}

describe.skipIf(!shouldRunDbIntegration())('Product classification regression (#110-3)', () => {
  beforeAll(async () => {
    await ensureTestMemberPassword(memberId);
  });

  afterEach(async () => {
    if (createdReceiptId) await prisma.receipt.delete({ where: { id: createdReceiptId } });
    createdReceiptId = null;
    await prisma.productClassificationHistory.deleteMany({
      where: { familyGroupId, normalizedName: { in: learningNames } },
    });
    await prisma.householdProductDictionary.deleteMany({
      where: { familyGroupId, normalizedName: { in: learningNames } },
    });
  });

  it('saves only an audit record for ITEM_ONLY', async () => {
    const item = await createTestItem('分類回帰OCR商品');
    const token = await loginAsTestMember(app, memberId);
    const milkId = await productTypeIdByCode('milk');

    const res = await request(app)
      .patch(`/api/receipts/items/${item.id}/product-classification`)
      .set('Authorization', `Bearer ${token}`)
      .send({ productTypeId: milkId, scope: 'item_only' });

    expect(res.status).toBe(200);
    await expect(
      prisma.classificationCorrection.findFirst({
        where: { itemId: item.id, scope: ClassificationCorrectionScope.ITEM_ONLY },
      })
    ).resolves.toMatchObject({ familyGroupId, actorMemberId: memberId, nextProductTypeId: milkId });
    await expect(
      prisma.householdProductDictionary.findUnique({
        where: {
          familyGroupId_normalizedName: { familyGroupId, normalizedName: getCleanText(item.name) },
        },
      })
    ).resolves.toBeNull();
  });

  it('reuses a SAME_OCR_NAME correction only in the same household', async () => {
    const item = await createTestItem('分類回帰OCR商品');
    const token = await loginAsTestMember(app, memberId);
    const milkId = await productTypeIdByCode('milk');

    const res = await request(app)
      .patch(`/api/receipts/items/${item.id}/product-classification`)
      .set('Authorization', `Bearer ${token}`)
      .send({ productTypeId: milkId, scope: 'same_ocr_name' });

    expect(res.status).toBe(200);
    await expect(
      prisma.householdProductDictionary.findUnique({
        where: {
          familyGroupId_normalizedName: { familyGroupId, normalizedName: getCleanText(item.name) },
        },
      })
    ).resolves.toMatchObject({ productTypeId: milkId });
    await expect(
      classifyItemByExactMatch(prisma as never, { familyGroupId, itemName: item.name })
    ).resolves.toMatchObject({
      productTypeId: milkId,
      classificationSource: ClassificationSource.HOUSEHOLD_DICTIONARY,
    });
    await expect(
      classifyItemByExactMatch(prisma as never, { familyGroupId: 2, itemName: item.name })
    ).resolves.toMatchObject({ productTypeId: null, classificationSource: null });
  });

  it('applies the learning priority and rejects cross-household item corrections', async () => {
    const milkId = await productTypeIdByCode('milk');
    const tissueId = await productTypeIdByCode('tissues');

    await prisma.householdProductDictionary.create({
      data: { familyGroupId, normalizedName: '牛乳', productTypeId: tissueId },
    });
    await prisma.productClassificationHistory.create({
      data: { familyGroupId, normalizedName: '牛乳', productTypeId: milkId },
    });

    await expect(
      classifyItemByExactMatch(prisma as never, { familyGroupId, itemName: '牛乳' })
    ).resolves.toMatchObject({ productTypeId: milkId, classificationSource: ClassificationSource.HISTORY });

    await prisma.productClassificationHistory.deleteMany({ where: { familyGroupId, normalizedName: '牛乳' } });
    await expect(
      classifyItemByExactMatch(prisma as never, { familyGroupId, itemName: '牛乳' })
    ).resolves.toMatchObject({
      productTypeId: tissueId,
      classificationSource: ClassificationSource.HOUSEHOLD_DICTIONARY,
    });

    await prisma.householdProductDictionary.deleteMany({ where: { familyGroupId, normalizedName: '牛乳' } });

    const token = await loginAsTestMember(app, memberId);
    const tenantBItemId = await getTenantBItemId();
    const crossTenantRes = await request(app)
      .patch(`/api/receipts/items/${tenantBItemId}/product-classification`)
      .set('Authorization', `Bearer ${token}`)
      .send({ productTypeId: milkId, scope: 'item_only' });
    expect(crossTenantRes.status).toBe(404);
  });

  it('uses the beverage standard dictionary in a household other than the source household', async () => {
    const teaId = await productTypeIdByCode('tea');

    await expect(
      classifyItemByExactMatch(prisma as never, { familyGroupId: 2, itemName: 'GRダカラやさしい麦茶2Lx6' })
    ).resolves.toMatchObject({
      productTypeId: teaId,
      classificationSource: ClassificationSource.STANDARD_DICTIONARY,
    });
  });

  it('classifies vehicle fuel into each household’s transport-and-communications category', async () => {
    const vehicleFuelId = await productTypeIdByCode('vehicle-fuel');

    for (const targetFamilyGroupId of [1, 2]) {
      const category = await prisma.category.findFirst({
        where: { familyGroupId: targetFamilyGroupId, name: '交通・通信' },
        select: { id: true },
      });
      if (!category) throw new Error(`Transport category is not seeded for family ${targetFamilyGroupId}.`);

      await expect(
        classifyItemByExactMatch(prisma as never, {
          familyGroupId: targetFamilyGroupId,
          itemName: 'レギュラー',
          price: 175.4,
          categoryId: null,
        })
      ).resolves.toMatchObject({
        categoryId: category.id,
        productTypeId: vehicleFuelId,
        productTypeStatus: ProductTypeStatus.CLASSIFIED,
        classificationSource: ClassificationSource.STANDARD_DICTIONARY,
      });
    }

    await expect(
      classifyItemByExactMatch(prisma as never, {
        familyGroupId,
        itemName: '洗車プリペイド',
        price: 1000,
        categoryId: null,
      })
    ).resolves.toMatchObject({ productTypeId: null, classificationSource: null });
  });

  it('keeps the household category while excluding an approved negative adjustment line', async () => {
    const category = await prisma.category.findFirst({
      where: { familyGroupId, name: '食費' },
      select: { id: true },
    });
    if (!category) throw new Error('Food category is not seeded.');

    await expect(
      classifyItemByExactMatch(prisma as never, {
        familyGroupId,
        itemName: 'LINE割引 5%',
        price: -161,
        categoryId: category.id,
      })
    ).resolves.toEqual({
      categoryId: category.id,
      standardCategoryId: null,
      productTypeId: null,
      productTypeStatus: ProductTypeStatus.NOT_APPLICABLE,
      classificationSource: null,
      classificationConfidence: null,
    });
  });
});
