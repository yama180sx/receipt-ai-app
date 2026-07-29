import { ProductTypeStatus } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const repositoryMocks = vi.hoisted(() => ({
  findProductClassificationReviewItems: vi.fn(),
}));

vi.mock('../../repositories/receiptRepository', () => repositoryMocks);

import { listProductClassificationReviewItems } from './receiptQueryService';

describe('listProductClassificationReviewItems', () => {
  beforeEach(() => {
    repositoryMocks.findProductClassificationReviewItems.mockReset();
    repositoryMocks.findProductClassificationReviewItems.mockResolvedValue({
      items: [],
      total: 21,
    });
  });

  it('uses all unresolved statuses and pagination defaults', async () => {
    await expect(
      listProductClassificationReviewItems({ familyGroupId: 7 })
    ).resolves.toMatchObject({
      items: [],
      total: 21,
      page: 1,
      limit: 20,
      totalPages: 2,
    });

    expect(repositoryMocks.findProductClassificationReviewItems).toHaveBeenCalledWith(
      expect.objectContaining({
        familyGroupId: 7,
        statuses: [
          ProductTypeStatus.NEEDS_REVIEW,
          ProductTypeStatus.UNCLASSIFIED,
          ProductTypeStatus.OUTSIDE_INITIAL_SCOPE,
        ],
        page: 1,
        limit: 20,
      })
    );
  });

  it('converts filters while preserving the tenant boundary', async () => {
    await listProductClassificationReviewItems({
      familyGroupId: 8,
      statuses: ['needs_review'],
      categoryId: '12',
      from: '2026-07-01',
      to: '2026-07-31',
      page: '2',
      limit: '10',
    });

    expect(repositoryMocks.findProductClassificationReviewItems).toHaveBeenCalledWith({
      familyGroupId: 8,
      statuses: [ProductTypeStatus.NEEDS_REVIEW],
      categoryId: 12,
      from: new Date('2026-07-01T00:00:00.000+09:00'),
      to: new Date('2026-07-31T23:59:59.999+09:00'),
      page: 2,
      limit: 10,
    });
  });

  it.each([
    [{ statuses: ['classified'] }, '対象外の商品分類状態'],
    [{ from: '2026-02-31' }, '有効な日付'],
    [{ from: '2026-07-10', to: '2026-07-01' }, '開始日は終了日以前'],
    [{ limit: '101' }, 'limitは100以下'],
  ])('rejects invalid review query %#', async (query, message) => {
    await expect(
      listProductClassificationReviewItems({ familyGroupId: 1, ...query })
    ).rejects.toThrow(message);
    expect(repositoryMocks.findProductClassificationReviewItems).not.toHaveBeenCalled();
  });
});
