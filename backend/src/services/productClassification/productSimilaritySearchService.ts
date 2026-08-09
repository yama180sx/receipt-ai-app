import { getCleanText } from '../../utils/normalizer';
import {
  findSimilarProductClassificationCandidatesInTx,
  type ProductSimilarityCandidate,
} from '../../repositories/productClassificationRepository';
import type { PrismaTx } from '../../utils/prismaTransaction';

export const PRODUCT_SIMILARITY_CANDIDATE_LIMIT = 5;

/**
 * 商品分類で利用する類似候補を返す。候補提示専用であり、分類の自動確定は行わない。
 */
export async function findProductSimilarityCandidates(
  tx: PrismaTx,
  input: { familyGroupId: number; itemName: string; limit?: number }
): Promise<ProductSimilarityCandidate[]> {
  const normalizedName = getCleanText(input.itemName);
  if (!normalizedName) return [];

  const limit = Math.min(Math.max(input.limit ?? PRODUCT_SIMILARITY_CANDIDATE_LIMIT, 1), PRODUCT_SIMILARITY_CANDIDATE_LIMIT);
  return findSimilarProductClassificationCandidatesInTx(tx, {
    familyGroupId: input.familyGroupId,
    normalizedName,
    limit,
  });
}
