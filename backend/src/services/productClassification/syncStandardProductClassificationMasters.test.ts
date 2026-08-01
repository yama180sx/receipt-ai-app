import { describe, expect, it, vi } from 'vitest';
import { syncStandardProductClassificationMasters } from '../../../prisma/syncStandardProductClassificationMasters';
import {
  INITIAL_PRODUCT_TYPES,
  INITIAL_STANDARD_PRODUCT_DICTIONARY,
  STANDARD_CATEGORIES,
} from '../../../prisma/standardProductClassificationSeed';

describe('syncStandardProductClassificationMasters', () => {
  it('upserts every global master entry without accessing household or receipt data', async () => {
    let nextCategoryId = 1;
    let nextProductTypeId = 101;
    const categoryIdByCode = new Map<string, number>();
    const productTypeIdByCode = new Map<string, number>();

    const standardCategory = {
      upsert: vi.fn(async ({ where }: { where: { code: string } }) => {
        const id = categoryIdByCode.get(where.code) ?? nextCategoryId++;
        categoryIdByCode.set(where.code, id);
        return { id };
      }),
    };
    const productType = {
      upsert: vi.fn(async ({ where }: { where: { code: string } }) => {
        const id = productTypeIdByCode.get(where.code) ?? nextProductTypeId++;
        productTypeIdByCode.set(where.code, id);
        return { id };
      }),
    };
    const standardProductDictionary = { upsert: vi.fn(async () => ({ id: 1 })) };
    const prisma = { standardCategory, productType, standardProductDictionary };

    await syncStandardProductClassificationMasters(prisma as never);
    await syncStandardProductClassificationMasters(prisma as never);

    expect(standardCategory.upsert).toHaveBeenCalledTimes(STANDARD_CATEGORIES.length * 2);
    expect(productType.upsert).toHaveBeenCalledTimes(INITIAL_PRODUCT_TYPES.length * 2);
    expect(standardProductDictionary.upsert).toHaveBeenCalledTimes(
      INITIAL_STANDARD_PRODUCT_DICTIONARY.length * 2
    );
    expect(standardCategory.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { code: 'food-beverages' },
        create: expect.objectContaining({ parentId: categoryIdByCode.get('food') }),
      })
    );
    expect(standardProductDictionary.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { normalizedName: 'zone hyper 400ml' },
        update: expect.objectContaining({ isActive: true }),
      })
    );
  });
});
