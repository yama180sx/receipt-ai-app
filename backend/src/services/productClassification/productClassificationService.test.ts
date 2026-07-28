import { ClassificationSource } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import { classifyItemByExactMatch } from './productClassificationService';

describe('classifyItemByExactMatch', () => {
  it('uses a household alias before the standard dictionary', async () => {
    const alias = {
      productTypeId: 11,
      productType: {
        standardCategory: { id: 4, name: '乳製品', parent: { name: '食費' } },
      },
    };
    const tx = {
      productClassificationHistory: { findUnique: vi.fn().mockResolvedValue(null) },
      householdProductDictionary: { findUnique: vi.fn().mockResolvedValue(null) },
      productClassificationAlias: { findUnique: vi.fn().mockResolvedValue(alias) },
      standardProductDictionary: { findUnique: vi.fn() },
      category: { findFirst: vi.fn().mockResolvedValue({ id: 2 }) },
    };

    const result = await classifyItemByExactMatch(tx as never, {
      familyGroupId: 1,
      itemName: 'いつもの牛乳',
    });

    expect(result).toMatchObject({
      categoryId: 2,
      standardCategoryId: 4,
      productTypeId: 11,
      classificationSource: ClassificationSource.HOUSEHOLD_DICTIONARY,
    });
    expect(tx.standardProductDictionary.findUnique).not.toHaveBeenCalled();
  });
});
