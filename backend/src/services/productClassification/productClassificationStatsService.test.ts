import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ findProductClassificationStatsItems: vi.fn() }));
vi.mock('../../repositories/productClassificationRepository', () => mocks);

import { getProductClassificationStats } from './productClassificationStatsService';

describe('getProductClassificationStats', () => {
  beforeEach(() => mocks.findProductClassificationStatsItems.mockReset());

  it('keeps unresolved items out of product type totals', async () => {
    mocks.findProductClassificationStatsItems.mockResolvedValue([
      { price: 100, quantity: 2, productTypeStatus: 'CLASSIFIED', productType: { id: 1, name: '牛乳', standardCategory: { id: 10, name: '乳製品', parent: { name: '食費' } } } },
      { price: 300, quantity: 1, productTypeStatus: 'NEEDS_REVIEW', productType: null },
      { price: -161, quantity: 1, productTypeStatus: 'NOT_APPLICABLE', productType: null },
    ]);

    await expect(getProductClassificationStats(1, '2026-07')).resolves.toEqual({
      month: '2026-07',
      categoryStats: [{ standardCategoryId: 10, standardCategoryName: '乳製品', parentCategoryName: '食費', totalAmount: 200, itemCount: 1, productTypes: [{ productTypeId: 1, productTypeName: '牛乳', totalAmount: 200, itemCount: 1 }] }],
      unresolved: [{ status: 'needs_review', totalAmount: 300, itemCount: 1 }],
    });
  });
});
