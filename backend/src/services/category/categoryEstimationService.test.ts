import { beforeEach, describe, expect, it, vi } from 'vitest';

const repository = vi.hoisted(() => ({
  findCategoryIdsByKeyword: vi.fn(),
  findFallbackCategoryId: vi.fn(),
}));

vi.mock('../../repositories/categoryRepository', () => repository);
vi.mock('../../utils/logger', () => ({
  default: { error: vi.fn() },
}));

import { estimateCategoryId } from './categoryEstimationService';

describe('estimateCategoryId', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns the first matching category for the same family group', async () => {
    repository.findCategoryIdsByKeyword.mockResolvedValue([{ id: 12 }]);

    await expect(estimateCategoryId('牛乳', 7)).resolves.toBe(12);
    expect(repository.findCategoryIdsByKeyword).toHaveBeenCalledWith(7, '牛乳');
    expect(repository.findFallbackCategoryId).not.toHaveBeenCalled();
  });

  it('falls back to the other category when no keyword matches', async () => {
    repository.findCategoryIdsByKeyword.mockResolvedValue([]);
    repository.findFallbackCategoryId.mockResolvedValue({ id: 99 });

    await expect(estimateCategoryId('未登録商品', 7)).resolves.toBe(99);
    expect(repository.findFallbackCategoryId).toHaveBeenCalledWith(7);
  });

  it('returns zero when category lookup fails', async () => {
    repository.findCategoryIdsByKeyword.mockRejectedValue(new Error('database unavailable'));

    await expect(estimateCategoryId('牛乳', 7)).resolves.toBe(0);
  });
});
