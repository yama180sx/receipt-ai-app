import { beforeEach, describe, expect, it, vi } from 'vitest';

const repositoryMocks = vi.hoisted(() => ({
  findProductClassificationCandidatesForItem: vi.fn(),
}));

vi.mock('../../repositories/productClassificationRepository', () => repositoryMocks);

import { listProductClassificationCandidates } from './productClassificationCandidateService';

describe('listProductClassificationCandidates', () => {
  beforeEach(() => {
    repositoryMocks.findProductClassificationCandidatesForItem.mockReset();
  });

  it('returns only candidates belonging to the requested household item', async () => {
    const candidates = [{ rank: 1, productType: { id: 11 } }];
    repositoryMocks.findProductClassificationCandidatesForItem.mockResolvedValue({ id: 10, productClassificationCandidates: candidates });

    await expect(listProductClassificationCandidates(10, 1)).resolves.toEqual(candidates);
    expect(repositoryMocks.findProductClassificationCandidatesForItem).toHaveBeenCalledWith(10, 1);
  });

  it('returns ItemNotFound when the item belongs to another household or is absent', async () => {
    repositoryMocks.findProductClassificationCandidatesForItem.mockResolvedValue(null);

    await expect(listProductClassificationCandidates(10, 1)).rejects.toThrow('ItemNotFound');
  });
});
