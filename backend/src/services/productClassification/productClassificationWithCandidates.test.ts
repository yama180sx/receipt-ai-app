import {
  ClassificationConfidence,
  ClassificationSource,
  ProductClassificationCandidateSource,
  ProductTypeStatus,
} from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const similaritySearchMocks = vi.hoisted(() => ({
  findProductSimilarityCandidates: vi.fn(),
}));

vi.mock('./productSimilaritySearchService', () => similaritySearchMocks);

import {
  classifyItemWithSimilarityCandidates,
  toProductClassificationCandidateInputs,
} from './productClassificationService';

function createUnmatchedTx(categoryName = '食費') {
  return {
    productClassificationHistory: { findUnique: vi.fn().mockResolvedValue(null) },
    householdProductDictionary: { findUnique: vi.fn().mockResolvedValue(null) },
    standardProductClassificationRule: { findMany: vi.fn().mockResolvedValue([]) },
    category: { findFirst: vi.fn().mockResolvedValue({ id: 2, name: categoryName }) },
  };
}

describe('classifyItemWithSimilarityCandidates', () => {
  beforeEach(() => {
    similaritySearchMocks.findProductSimilarityCandidates.mockReset();
  });

  it('keeps a similar item unconfirmed and marks it needs_review', async () => {
    const candidates = [
      {
        normalizedName: '特濃牛乳',
        productTypeId: 11,
        productTypeName: '牛乳',
        standardCategoryId: 4,
        source: 'history',
        similarity: 0.8,
      },
    ];
    similaritySearchMocks.findProductSimilarityCandidates.mockResolvedValue(candidates);

    const result = await classifyItemWithSimilarityCandidates(createUnmatchedTx() as never, {
      familyGroupId: 1,
      itemName: '特濃牛乳 1000ml',
      categoryId: 2,
    });

    expect(result).toMatchObject({
      classification: {
        productTypeId: null,
        productTypeStatus: ProductTypeStatus.NEEDS_REVIEW,
        classificationSource: ClassificationSource.SIMILARITY,
        classificationConfidence: ClassificationConfidence.MEDIUM,
      },
      candidates,
    });
  });

  it('does not search candidates for a category outside the initial classification scope', async () => {
    const result = await classifyItemWithSimilarityCandidates(createUnmatchedTx('住居') as never, {
      familyGroupId: 1,
      itemName: '家賃',
      categoryId: 2,
    });

    expect(result.classification.productTypeStatus).toBe(ProductTypeStatus.NOT_APPLICABLE);
    expect(similaritySearchMocks.findProductSimilarityCandidates).not.toHaveBeenCalled();
  });

  it('maps saved candidates to their Prisma source and rank', () => {
    expect(
      toProductClassificationCandidateInputs([
        {
          normalizedName: '特濃牛乳',
          productTypeId: 11,
          productTypeName: '牛乳',
          standardCategoryId: 4,
          source: 'history',
          similarity: 0.8,
        },
      ])
    ).toEqual([
      {
        productTypeId: 11,
        source: ProductClassificationCandidateSource.HISTORY,
        matchedNormalizedName: '特濃牛乳',
        similarity: 0.8,
        rank: 1,
      },
    ]);
  });
});
