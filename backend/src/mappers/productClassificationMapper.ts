import type { ProductClassificationCandidate, ProductType } from '@prisma/client';
import type {
  ProductClassificationCandidateSummary,
  ProductTypeSummary,
} from '../types/apiSchemas';

export function mapProductTypesToSummary(productTypes: ProductType[]): ProductTypeSummary[] {
  return productTypes.map((productType) => ({
    id: productType.id,
    code: productType.code,
    name: productType.name,
    standardCategoryId: productType.standardCategoryId,
  }));
}

export function mapProductClassificationCandidatesToSummary(
  candidates: Array<ProductClassificationCandidate & { productType: ProductType }>
): ProductClassificationCandidateSummary[] {
  return candidates.map((candidate) => ({
    productType: {
      id: candidate.productType.id,
      code: candidate.productType.code,
      name: candidate.productType.name,
      standardCategoryId: candidate.productType.standardCategoryId,
    },
    source: candidate.source.toLowerCase() as ProductClassificationCandidateSummary['source'],
    matchedNormalizedName: candidate.matchedNormalizedName,
    similarity: candidate.similarity,
    rank: candidate.rank,
  }));
}
