import {
  ClassificationConfidence,
  ProductClassificationCandidateSource,
  ClassificationSource,
  ProductTypeStatus,
} from '@prisma/client';
import type { PrismaTx } from '../../utils/prismaTransaction';
import { getCleanText } from '../../utils/normalizer';
import { findProductSimilarityCandidates } from './productSimilaritySearchService';
import type { ProductSimilarityCandidate } from '../../repositories/productClassificationRepository';

export type ProductClassificationResult = {
  categoryId: number | null;
  standardCategoryId: number | null;
  productTypeId: number | null;
  productTypeStatus: ProductTypeStatus;
  classificationSource: ClassificationSource | null;
  classificationConfidence: ClassificationConfidence | null;
};

export type ProductClassificationWithCandidatesResult = {
  classification: ProductClassificationResult;
  candidates: ProductSimilarityCandidate[];
};

type MatchedProductType = {
  productTypeId: number;
  standardCategoryId: number;
  rootCategoryName: string;
  source: ClassificationSource;
};
type StandardRuleConflict = { conflict: true };

async function findMatchedProductType(
  tx: PrismaTx,
  familyGroupId: number,
  normalizedName: string
): Promise<MatchedProductType | StandardRuleConflict | null> {
  const productTypeInclude = {
    standardCategory: { include: { parent: true } },
  } as const;

  const history = await tx.productClassificationHistory.findUnique({
    where: { familyGroupId_normalizedName: { familyGroupId, normalizedName } },
    include: { productType: { include: productTypeInclude } },
  });
  const dictionaryRecord = history
    ? null
    : await tx.householdProductDictionary.findUnique({
        where: { familyGroupId_normalizedName: { familyGroupId, normalizedName } },
        include: { productType: { include: productTypeInclude } },
      });
  const dictionary = dictionaryRecord?.isActive ? dictionaryRecord : null;
  const standardRules = history || dictionary
    ? []
    : await tx.standardProductClassificationRule.findMany({
        where: { isActive: true },
        include: { standardCategory: { include: { parent: true } }, productType: true },
        orderBy: [{ priority: 'asc' }, { id: 'asc' }],
      });

  if (history || dictionary) {
    const record = history ?? dictionary!;
    const category = record.productType.standardCategory;
    return {
      productTypeId: record.productTypeId,
      standardCategoryId: category.id,
      rootCategoryName: category.parent?.name ?? category.name,
      source: history ? ClassificationSource.HISTORY : ClassificationSource.HOUSEHOLD_DICTIONARY,
    };
  }
  const matchingRules = standardRules.filter((rule) => normalizedName.includes(rule.normalizedKeyword));
  if (matchingRules.length > 0) {
    const highestPriority = matchingRules[0].priority;
    const highestRules = matchingRules.filter((rule) => rule.priority === highestPriority);
    if (new Set(highestRules.map((rule) => rule.productTypeId)).size > 1) return { conflict: true };
    const standard = highestRules[0];
    return {
      productTypeId: standard.productTypeId,
      standardCategoryId: standard.standardCategoryId,
      rootCategoryName: standard.standardCategory.parent?.name ?? standard.standardCategory.name,
      source: ClassificationSource.STANDARD_DICTIONARY,
    };
  }
  return null;
}

/** 完全一致分類。類似検索・AI・ユーザー修正の学習は後続Phaseで扱う。 */
export async function classifyItemByExactMatch(
  tx: PrismaTx,
  input: { familyGroupId: number; itemName: string; categoryId?: number | null }
): Promise<ProductClassificationResult> {
  const normalizedName = getCleanText(input.itemName);
  const matched = normalizedName
    ? await findMatchedProductType(tx, input.familyGroupId, normalizedName)
    : null;

  if (matched && !('conflict' in matched)) {
    const legacyCategory = await tx.category.findFirst({
      where: { familyGroupId: input.familyGroupId, name: matched.rootCategoryName },
      select: { id: true },
    });
    return {
      categoryId: legacyCategory?.id ?? input.categoryId ?? null,
      standardCategoryId: matched.standardCategoryId,
      productTypeId: matched.productTypeId,
      productTypeStatus: ProductTypeStatus.CLASSIFIED,
      classificationSource: matched.source,
      classificationConfidence: ClassificationConfidence.HIGH,
    };
  }

  if (matched?.conflict) {
    return {
      categoryId: input.categoryId ?? null,
      standardCategoryId: null,
      productTypeId: null,
      productTypeStatus: ProductTypeStatus.NEEDS_REVIEW,
      classificationSource: ClassificationSource.STANDARD_DICTIONARY,
      classificationConfidence: ClassificationConfidence.MEDIUM,
    };
  }

  const category = input.categoryId
    ? await tx.category.findFirst({
        where: { id: input.categoryId, familyGroupId: input.familyGroupId },
        select: { id: true, name: true },
      })
    : null;
  if (!category) {
    return {
      categoryId: null,
      standardCategoryId: null,
      productTypeId: null,
      productTypeStatus: ProductTypeStatus.UNCLASSIFIED,
      classificationSource: null,
      classificationConfidence: null,
    };
  }
  const isInitialTarget = category.name === '食費' || category.name === '日用品';
  return {
    categoryId: category.id,
    standardCategoryId: null,
    productTypeId: null,
    productTypeStatus: isInitialTarget
      ? ProductTypeStatus.UNCLASSIFIED
      : ProductTypeStatus.NOT_APPLICABLE,
    classificationSource: null,
    classificationConfidence: null,
  };
}

const candidateSourceMap: Record<
  ProductSimilarityCandidate['source'],
  ProductClassificationCandidateSource
> = {
  history: ProductClassificationCandidateSource.HISTORY,
  household_dictionary: ProductClassificationCandidateSource.HOUSEHOLD_DICTIONARY,
  standard_dictionary: ProductClassificationCandidateSource.STANDARD_DICTIONARY,
};

/**
 * 標準ルールで未解決の明細へ類似候補を付与する。
 * 類似候補はProductTypeを確定せず、needs_reviewとして保持するだけである。
 */
export async function classifyItemWithSimilarityCandidates(
  tx: PrismaTx,
  input: { familyGroupId: number; itemName: string; categoryId?: number | null }
): Promise<ProductClassificationWithCandidatesResult> {
  const classification = await classifyItemByExactMatch(tx, input);
  if (classification.productTypeStatus !== ProductTypeStatus.UNCLASSIFIED) {
    return { classification, candidates: [] };
  }

  const candidates = await findProductSimilarityCandidates(tx, {
    familyGroupId: input.familyGroupId,
    itemName: input.itemName,
  });
  if (candidates.length === 0) return { classification, candidates };

  return {
    classification: {
      ...classification,
      productTypeStatus: ProductTypeStatus.NEEDS_REVIEW,
      classificationSource: ClassificationSource.SIMILARITY,
      classificationConfidence: ClassificationConfidence.MEDIUM,
    },
    candidates,
  };
}

export function toProductClassificationCandidateInputs(candidates: ProductSimilarityCandidate[]) {
  return candidates.map((candidate, index) => ({
    productTypeId: candidate.productTypeId,
    source: candidateSourceMap[candidate.source],
    matchedNormalizedName: candidate.normalizedName,
    similarity: candidate.similarity,
    rank: index + 1,
  }));
}
