import '../../test/mockReceiptQueue';

import { Prisma } from '@prisma/client';
import { afterEach, describe, expect, it } from 'vitest';
import { findProductSimilarityCandidates } from '../../services/productClassification/productSimilaritySearchService';
import { prisma } from '../../utils/prismaClient';
import { shouldRunDbIntegration } from './helpers/integrationHelpers';

const familyGroupId = 1;
const otherFamilyGroupId = 2;
const householdName = '類似検索用特濃牛乳';
const standardName = '類似検索用ポテトチップス';

async function productTypeByCode(code: string) {
  const productType = await prisma.productType.findUnique({
    where: { code },
    select: { id: true, standardCategoryId: true },
  });
  if (!productType) throw new Error(`Product type ${code} is not seeded.`);
  return productType;
}

describe.skipIf(!shouldRunDbIntegration())('Product similarity search (#111-1)', () => {
  afterEach(async () => {
    await prisma.productClassificationHistory.deleteMany({
      where: { normalizedName: householdName, familyGroupId: { in: [familyGroupId, otherFamilyGroupId] } },
    });
    await prisma.standardProductDictionary.deleteMany({ where: { normalizedName: standardName } });
  });

  it('returns same-household and standard candidates without exposing another household', async () => {
    const milk = await productTypeByCode('milk');
    const tissues = await productTypeByCode('tissues');
    const chips = await productTypeByCode('potato-chips');

    await prisma.productClassificationHistory.create({
      data: { familyGroupId, normalizedName: householdName, productTypeId: milk.id },
    });
    await prisma.productClassificationHistory.create({
      data: { familyGroupId: otherFamilyGroupId, normalizedName: householdName, productTypeId: tissues.id },
    });
    await prisma.standardProductDictionary.create({
      data: {
        normalizedName: standardName,
        standardCategoryId: chips.standardCategoryId,
        productTypeId: chips.id,
      },
    });

    const householdCandidates = await findProductSimilarityCandidates(prisma as never, {
      familyGroupId,
      itemName: '類似検索用特濃牛乳 1000ml',
    });
    const standardCandidates = await findProductSimilarityCandidates(prisma as never, {
      familyGroupId,
      itemName: '類似検索用ポテトチップ',
    });

    expect(householdCandidates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ productTypeId: milk.id, source: 'history' }),
      ])
    );
    expect(householdCandidates).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ productTypeId: tissues.id })])
    );
    expect(standardCandidates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ productTypeId: chips.id, source: 'standard_dictionary' }),
      ])
    );
  });

  it('creates the trigram indexes used by the shared search base', async () => {
    await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe('SET LOCAL enable_seqscan = off');
      const plan = await tx.$queryRaw<Array<{ 'QUERY PLAN': unknown }>>(Prisma.sql`
        EXPLAIN (FORMAT JSON)
        SELECT id
        FROM "Item"
        WHERE "normalizedName" % ${householdName}
      `);

      expect(JSON.stringify(plan)).toContain('Item_normalizedName_trgm_idx');
    });
  });
});
