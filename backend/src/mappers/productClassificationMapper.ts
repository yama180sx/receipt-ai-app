import type { ProductClassificationCandidate, ProductType } from '@prisma/client';
import type {
  ProductClassificationLearningData,
  ProductClassificationCandidateSummary,
  ProductTypeSummary,
} from '../types/apiSchemas';
import type { ProductClassificationLearningDataRecord } from '../services/productClassification/productClassificationLearningDataService';

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

export function mapProductClassificationLearningData(
  records: ProductClassificationLearningDataRecord[]
): ProductClassificationLearningData[] {
  return records.map((record) => ({
    ...record,
    productType: { ...record.productType },
  }));
}
