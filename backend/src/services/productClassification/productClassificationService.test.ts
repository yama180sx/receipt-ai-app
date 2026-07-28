import { ClassificationSource } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import { classifyItemByExactMatch } from './productClassificationService';

function matchedRecord(productTypeId: number) {
  return {
    productTypeId,
    productType: {
      standardCategory: { id: 4, name: '乳製品', parent: { name: '食費' } },
    },
  };
}

function createTx(input: {
  history?: Record<number, unknown>;
  dictionary?: Record<number, unknown>;
  alias?: Record<number, unknown>;
  standard?: unknown;
}) {
  return {
    productClassificationHistory: {
      findUnique: vi.fn(({ where }) =>
        Promise.resolve(input.history?.[where.familyGroupId_normalizedName.familyGroupId] ?? null)
      ),
    },
    householdProductDictionary: {
      findUnique: vi.fn(({ where }) =>
        Promise.resolve(input.dictionary?.[where.familyGroupId_normalizedName.familyGroupId] ?? null)
      ),
    },
    productClassificationAlias: {
      findUnique: vi.fn(({ where }) =>
        Promise.resolve(input.alias?.[where.familyGroupId_normalizedName.familyGroupId] ?? null)
      ),
    },
    standardProductDictionary: { findUnique: vi.fn().mockResolvedValue(input.standard ?? null) },
    category: { findFirst: vi.fn().mockResolvedValue({ id: 2 }) },
  };
}

describe('classifyItemByExactMatch', () => {
  it('applies history, household dictionary, alias, and standard dictionary in that order', async () => {
    const history = matchedRecord(101);
    const dictionary = matchedRecord(102);
    const alias = matchedRecord(103);
    const standard = {
      productTypeId: 104,
      standardCategoryId: 4,
      standardCategory: { id: 4, name: '乳製品', parent: { name: '食費' } },
      productType: { id: 104 },
    };

    const withHistory = createTx({ history: { 1: history }, dictionary: { 1: dictionary }, alias: { 1: alias }, standard });
    const withDictionary = createTx({ dictionary: { 1: dictionary }, alias: { 1: alias }, standard });
    const withAlias = createTx({ alias: { 1: alias }, standard });
    const withStandard = createTx({ standard });

    await expect(classifyItemByExactMatch(withHistory as never, { familyGroupId: 1, itemName: '対象商品' }))
      .resolves.toMatchObject({ productTypeId: 101, classificationSource: ClassificationSource.HISTORY });
    await expect(classifyItemByExactMatch(withDictionary as never, { familyGroupId: 1, itemName: '対象商品' }))
      .resolves.toMatchObject({ productTypeId: 102, classificationSource: ClassificationSource.HOUSEHOLD_DICTIONARY });
    await expect(classifyItemByExactMatch(withAlias as never, { familyGroupId: 1, itemName: '対象商品' }))
      .resolves.toMatchObject({ productTypeId: 103, classificationSource: ClassificationSource.HOUSEHOLD_DICTIONARY });
    await expect(classifyItemByExactMatch(withStandard as never, { familyGroupId: 1, itemName: '対象商品' }))
      .resolves.toMatchObject({ productTypeId: 104, classificationSource: ClassificationSource.STANDARD_DICTIONARY });
  });

  it('does not read another household’s learning records', async () => {
    const tx = createTx({
      history: { 2: matchedRecord(201) },
      dictionary: { 2: matchedRecord(202) },
      alias: { 2: matchedRecord(203) },
      standard: {
        productTypeId: 204,
        standardCategoryId: 4,
        standardCategory: { id: 4, name: '乳製品', parent: { name: '食費' } },
        productType: { id: 204 },
      },
    });

    const result = await classifyItemByExactMatch(tx as never, { familyGroupId: 1, itemName: '対象商品' });

    expect(result).toMatchObject({
      productTypeId: 204,
      classificationSource: ClassificationSource.STANDARD_DICTIONARY,
    });
    expect(tx.productClassificationHistory.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { familyGroupId_normalizedName: { familyGroupId: 1, normalizedName: '対象商品' } } })
    );
  });
});
