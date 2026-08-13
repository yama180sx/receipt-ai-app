import { describe, expect, it, vi } from 'vitest';
import { syncStandardProductClassificationMasters } from '../../../prisma/syncStandardProductClassificationMasters';
import { loadInitialData } from '../../../prisma/initialData';

describe('syncStandardProductClassificationMasters', () => {
  it('upserts every global master entry without accessing household or receipt data', async () => {
    const { standard } = loadInitialData();
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
    const standardProductClassificationRule = { upsert: vi.fn(async () => ({ id: 1 })) };
    const prisma = { standardCategory, productType, standardProductClassificationRule };

    await syncStandardProductClassificationMasters(prisma as never);
    await syncStandardProductClassificationMasters(prisma as never);

    expect(standardCategory.upsert).toHaveBeenCalledTimes(standard.standardCategories.length * 2);
    expect(productType.upsert).toHaveBeenCalledTimes(standard.productTypes.length * 2);
    expect(standardProductClassificationRule.upsert).toHaveBeenCalledTimes(
      standard.standardProductClassificationRules.length * 2
    );
    expect(standardCategory.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { code: 'food-beverages' },
        create: expect.objectContaining({ parentId: categoryIdByCode.get('food') }),
      })
    );
    expect(standardProductClassificationRule.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ normalizedKeyword_productTypeId: expect.objectContaining({ normalizedKeyword: 'zone' }) }),
        update: expect.objectContaining({ priority: 100, isActive: true }),
      })
    );
  });
});
