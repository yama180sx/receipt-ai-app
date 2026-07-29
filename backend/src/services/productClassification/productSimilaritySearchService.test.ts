import { beforeEach, describe, expect, it, vi } from 'vitest';

const repositoryMocks = vi.hoisted(() => ({
  findSimilarProductClassificationCandidatesInTx: vi.fn(),
}));

vi.mock('../../repositories/productClassificationRepository', () => repositoryMocks);

import {
  findProductSimilarityCandidates,
  PRODUCT_SIMILARITY_CANDIDATE_LIMIT,
} from './productSimilaritySearchService';

describe('findProductSimilarityCandidates', () => {
  beforeEach(() => {
    repositoryMocks.findSimilarProductClassificationCandidatesInTx.mockReset();
  });

  it('normalizes the item name and limits candidates to five', async () => {
    repositoryMocks.findSimilarProductClassificationCandidatesInTx.mockResolvedValue([]);

    await findProductSimilarityCandidates({} as never, {
      familyGroupId: 1,
      itemName: '  MILK　1000ML ',
      limit: 10,
    });

    expect(repositoryMocks.findSimilarProductClassificationCandidatesInTx).toHaveBeenCalledWith(
      {},
      {
        familyGroupId: 1,
        normalizedName: 'milk 1000ml',
        limit: PRODUCT_SIMILARITY_CANDIDATE_LIMIT,
      }
    );
  });

  it('does not query for an empty normalized item name', async () => {
    await expect(
      findProductSimilarityCandidates({} as never, { familyGroupId: 1, itemName: '  ' })
    ).resolves.toEqual([]);

    expect(repositoryMocks.findSimilarProductClassificationCandidatesInTx).not.toHaveBeenCalled();
  });
});
