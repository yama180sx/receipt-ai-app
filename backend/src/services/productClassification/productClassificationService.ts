import {
  ClassificationConfidence,
  ClassificationSource,
  ProductTypeStatus,
} from '@prisma/client';
import type { PrismaTx } from '../../utils/prismaTransaction';
import { getCleanText } from '../../utils/normalizer';

export type ProductClassificationResult = {
  categoryId: number | null;
  standardCategoryId: number | null;
  productTypeId: number | null;
  productTypeStatus: ProductTypeStatus;
  classificationSource: ClassificationSource | null;
  classificationConfidence: ClassificationConfidence | null;
};

type MatchedProductType = {
  productTypeId: number;
  standardCategoryId: number;
  rootCategoryName: string;
  source: ClassificationSource;
};

async function findMatchedProductType(
  tx: PrismaTx,
  familyGroupId: number,
  normalizedName: string
): Promise<MatchedProductType | null> {
  const productTypeInclude = {
    standardCategory: { include: { parent: true } },
  } as const;

  const history = await tx.productClassificationHistory.findUnique({
    where: { familyGroupId_normalizedName: { familyGroupId, normalizedName } },
    include: { productType: { include: productTypeInclude } },
  });
  const dictionary = history
    ? null
    : await tx.householdProductDictionary.findUnique({
        where: { familyGroupId_normalizedName: { familyGroupId, normalizedName } },
        include: { productType: { include: productTypeInclude } },
      });
  const standard = history || dictionary
    ? null
    : await tx.standardProductDictionary.findUnique({
        where: { normalizedName },
        include: { standardCategory: { include: { parent: true } }, productType: true },
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
  if (standard) {
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

  if (matched) {
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
      ? ProductTypeStatus.OUTSIDE_INITIAL_SCOPE
      : ProductTypeStatus.NOT_APPLICABLE,
    classificationSource: null,
    classificationConfidence: null,
  };
}
