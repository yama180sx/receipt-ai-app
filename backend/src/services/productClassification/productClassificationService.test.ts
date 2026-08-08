import { ClassificationSource } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import { classifyItemByExactMatch, isNonProductAdjustmentLine } from './productClassificationService';

function matchedRecord(productTypeId: number) {
  return {
    productTypeId,
    isActive: true,
    productType: {
      standardCategory: { id: 4, name: '乳製品', parent: { name: '食費' } },
    },
  };
}

function createTx(input: {
  history?: Record<number, unknown>;
  dictionary?: Record<number, unknown>;
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
    standardProductClassificationRule: {
      findMany: vi.fn().mockResolvedValue(input.standard ? [{
        ...(input.standard as object), normalizedKeyword: '対象商品', priority: 100,
      }] : []),
    },
    category: { findFirst: vi.fn().mockResolvedValue({ id: 2 }) },
  };
}

describe('classifyItemByExactMatch', () => {
  it.each([
    ['▼20260706app', -119],
    ['LINE割引 5%', -161],
    ['まとめ売り値引', -9],
    ['感謝デー 5%', -157],
  ])('identifies the approved non-product adjustment pattern: %s', (itemName, price) => {
    expect(isNonProductAdjustmentLine({ itemName, price })).toBe(true);
  });

  it('does not identify a non-product adjustment from a negative amount alone', () => {
    expect(isNonProductAdjustmentLine({ itemName: '返品', price: -500 })).toBe(false);
    expect(isNonProductAdjustmentLine({ itemName: 'LINE割引 5%', price: 161 })).toBe(false);
    expect(isNonProductAdjustmentLine({ itemName: 'LINE割引 5%', price: Number.NaN })).toBe(false);
  });

  it('excludes an approved adjustment before reading household learning data', async () => {
    const tx = createTx({ history: { 1: matchedRecord(101) } });

    await expect(classifyItemByExactMatch(tx as never, {
      familyGroupId: 1,
      itemName: 'LINE割引 5%',
      price: -161,
      categoryId: 2,
    })).resolves.toEqual({
      categoryId: 2,
      standardCategoryId: null,
      productTypeId: null,
      productTypeStatus: 'NOT_APPLICABLE',
      classificationSource: null,
      classificationConfidence: null,
    });
    expect(tx.productClassificationHistory.findUnique).not.toHaveBeenCalled();
    expect(tx.householdProductDictionary.findUnique).not.toHaveBeenCalled();
    expect(tx.standardProductClassificationRule.findMany).not.toHaveBeenCalled();
  });

  it('applies history, household dictionary, and standard rules in that order', async () => {
    const history = matchedRecord(101);
    const dictionary = matchedRecord(102);
    const standard = {
      productTypeId: 104,
      standardCategoryId: 4,
      standardCategory: { id: 4, name: '乳製品', parent: { name: '食費' } },
      productType: { id: 104 },
    };

    const withHistory = createTx({ history: { 1: history }, dictionary: { 1: dictionary }, standard });
    const withDictionary = createTx({ dictionary: { 1: dictionary }, standard });
    const withStandard = createTx({ standard });

    await expect(classifyItemByExactMatch(withHistory as never, { familyGroupId: 1, itemName: '対象商品' }))
      .resolves.toMatchObject({ productTypeId: 101, classificationSource: ClassificationSource.HISTORY });
    await expect(classifyItemByExactMatch(withDictionary as never, { familyGroupId: 1, itemName: '対象商品' }))
      .resolves.toMatchObject({ productTypeId: 102, classificationSource: ClassificationSource.HOUSEHOLD_DICTIONARY });
    await expect(classifyItemByExactMatch(withStandard as never, { familyGroupId: 1, itemName: '対象商品' }))
      .resolves.toMatchObject({ productTypeId: 104, classificationSource: ClassificationSource.STANDARD_DICTIONARY });
  });

  it('does not read another household’s learning records', async () => {
    const tx = createTx({
      history: { 2: matchedRecord(201) },
      dictionary: { 2: matchedRecord(202) },
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

  it('classifies an approved vehicle fuel rule into the same-family transport category', async () => {
    const standard = {
      productTypeId: 501,
      standardCategoryId: 50,
      standardCategory: { id: 50, name: '交通・通信', parent: null },
      productType: { id: 501 },
    };
    const tx = createTx({ standard });

    await expect(classifyItemByExactMatch(tx as never, {
      familyGroupId: 1,
      itemName: '対象商品',
      price: 175.4,
      categoryId: 99,
    })).resolves.toMatchObject({
      categoryId: 2,
      standardCategoryId: 50,
      productTypeId: 501,
      productTypeStatus: 'CLASSIFIED',
      classificationSource: ClassificationSource.STANDARD_DICTIONARY,
    });
    expect(tx.category.findFirst).toHaveBeenCalledWith({
      where: { familyGroupId: 1, name: '交通・通信' },
      select: { id: true },
    });
  });

  it('ignores inactive household dictionaries', async () => {
    const inactiveDictionary = { ...matchedRecord(101), isActive: false };
    const standard = {
      productTypeId: 104,
      standardCategoryId: 4,
      standardCategory: { id: 4, name: '乳製品', parent: { name: '食費' } },
      productType: { id: 104 },
    };

    const withInactiveDictionary = createTx({ dictionary: { 1: inactiveDictionary }, standard });

    await expect(classifyItemByExactMatch(withInactiveDictionary as never, { familyGroupId: 1, itemName: '対象商品' }))
      .resolves.toMatchObject({ productTypeId: 104, classificationSource: ClassificationSource.STANDARD_DICTIONARY });
  });
});
