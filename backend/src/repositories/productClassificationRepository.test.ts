import { ProductTypeStatus } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const prismaMocks = vi.hoisted(() => ({
  item: { findMany: vi.fn() },
}));

vi.mock('../utils/prismaClient', () => ({ prisma: prismaMocks }));

import { findItemsForProductClassificationReclassification } from './productClassificationRepository';

describe('findItemsForProductClassificationReclassification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMocks.item.findMany.mockResolvedValue([]);
  });

  it('applies the start and end date to the same receipt date condition', async () => {
    const startDate = new Date('2026-07-10T00:00:00+09:00');
    const endDate = new Date('2026-07-11T00:00:00+09:00');

    await findItemsForProductClassificationReclassification({
      familyGroupId: 1,
      statuses: [ProductTypeStatus.UNCLASSIFIED],
      startDate,
      endDate,
      limit: 100,
    });

    expect(prismaMocks.item.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        receipt: expect.objectContaining({
          familyGroupId: 1,
          date: { gte: startDate, lt: endDate },
        }),
      }),
    }));
  });
});
