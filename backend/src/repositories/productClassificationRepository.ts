import {
  Prisma,
  type ClassificationCorrectionScope,
  type ProductClassificationCandidateSource,
} from '@prisma/client';
import { prisma } from '../utils/prismaClient';
import type { PrismaTx } from '../utils/prismaTransaction';

export async function findActiveProductTypeWithCategoryInTx(tx: PrismaTx, productTypeId: number) {
  return tx.productType.findFirst({
    where: {
      id: productTypeId,
      isActive: true,
      standardCategory: { isActive: true },
    },
    include: { standardCategory: { include: { parent: true } } },
  });
}

export async function findActiveProductTypes() {
  return prisma.productType.findMany({
    where: { isActive: true, standardCategory: { isActive: true } },
    orderBy: [{ standardCategory: { displayOrder: 'asc' } }, { displayOrder: 'asc' }],
  });
}

export async function findCategoryForProductTypeInTx(
  tx: PrismaTx,
  familyGroupId: number,
  rootCategoryName: string
) {
  return tx.category.findFirst({
    where: { familyGroupId, name: rootCategoryName },
    select: { id: true },
  });
}

export async function createClassificationCorrectionInTx(
  tx: PrismaTx,
  input: {
    familyGroupId: number;
    itemId: number;
    actorMemberId: number;
    previousProductTypeId: number | null;
    nextProductTypeId: number;
    scope: ClassificationCorrectionScope;
  }
) {
  return tx.classificationCorrection.create({ data: input });
}

export async function upsertHouseholdProductDictionaryInTx(
  tx: PrismaTx,
  input: { familyGroupId: number; normalizedName: string; productTypeId: number }
) {
  return tx.householdProductDictionary.upsert({
    where: {
      familyGroupId_normalizedName: {
        familyGroupId: input.familyGroupId,
        normalizedName: input.normalizedName,
      },
    },
    create: { ...input, isActive: true },
    update: { productTypeId: input.productTypeId, isActive: true },
  });
}

export async function upsertProductClassificationAliasInTx(
  tx: PrismaTx,
  input: { familyGroupId: number; normalizedName: string; productTypeId: number }
) {
  return tx.productClassificationAlias.upsert({
    where: {
      familyGroupId_normalizedName: {
        familyGroupId: input.familyGroupId,
        normalizedName: input.normalizedName,
      },
    },
    create: { ...input, isActive: true },
    update: { productTypeId: input.productTypeId, isActive: true },
  });
}

export type ProductSimilarityCandidateSource =
  | 'history'
  | 'household_dictionary'
  | 'alias'
  | 'standard_dictionary';

export type ProductSimilarityCandidate = {
  normalizedName: string;
  productTypeId: number;
  productTypeName: string;
  standardCategoryId: number;
  source: ProductSimilarityCandidateSource;
  similarity: number;
};

type ProductSimilarityCandidateRow = ProductSimilarityCandidate;

/**
 * pg_trgm による商品分類候補検索。
 * 世帯固有の候補は必ず familyGroupId で絞り、標準辞書だけは全世帯共通で検索する。
 * このRepositoryは候補を返すだけで、Itemの分類状態を更新しない。
 */
export async function findSimilarProductClassificationCandidatesInTx(
  tx: PrismaTx,
  input: { familyGroupId: number; normalizedName: string; limit: number }
): Promise<ProductSimilarityCandidate[]> {
  const rows = await tx.$queryRaw<ProductSimilarityCandidateRow[]>(Prisma.sql`
    WITH candidates AS (
      SELECT
        history."normalizedName",
        history."productTypeId",
        'history'::text AS source,
        1 AS source_priority,
        similarity(history."normalizedName", ${input.normalizedName}) AS similarity
      FROM "ProductClassificationHistory" AS history
      WHERE history."familyGroupId" = ${input.familyGroupId}
        AND history."normalizedName" % ${input.normalizedName}

      UNION ALL

      SELECT
        dictionary."normalizedName",
        dictionary."productTypeId",
        'household_dictionary'::text AS source,
        2 AS source_priority,
        similarity(dictionary."normalizedName", ${input.normalizedName}) AS similarity
      FROM "HouseholdProductDictionary" AS dictionary
      WHERE dictionary."familyGroupId" = ${input.familyGroupId}
        AND dictionary."isActive" = true
        AND dictionary."normalizedName" % ${input.normalizedName}

      UNION ALL

      SELECT
        alias."normalizedName",
        alias."productTypeId",
        'alias'::text AS source,
        3 AS source_priority,
        similarity(alias."normalizedName", ${input.normalizedName}) AS similarity
      FROM "ProductClassificationAlias" AS alias
      WHERE alias."familyGroupId" = ${input.familyGroupId}
        AND alias."isActive" = true
        AND alias."normalizedName" % ${input.normalizedName}

      UNION ALL

      SELECT
        standard."normalizedName",
        standard."productTypeId",
        'standard_dictionary'::text AS source,
        4 AS source_priority,
        similarity(standard."normalizedName", ${input.normalizedName}) AS similarity
      FROM "StandardProductDictionary" AS standard
      WHERE standard."isActive" = true
        AND standard."normalizedName" % ${input.normalizedName}
    ), ranked AS (
      SELECT
        candidates.*,
        row_number() OVER (
          PARTITION BY candidates."productTypeId"
          ORDER BY candidates.similarity DESC, candidates.source_priority ASC, candidates."normalizedName" ASC
        ) AS candidate_rank
      FROM candidates
    )
    SELECT
      ranked."normalizedName",
      ranked."productTypeId",
      product_type."name" AS "productTypeName",
      product_type."standardCategoryId",
      ranked.source,
      ranked.similarity
    FROM ranked
    INNER JOIN "ProductType" AS product_type ON product_type.id = ranked."productTypeId"
    INNER JOIN "StandardCategory" AS standard_category ON standard_category.id = product_type."standardCategoryId"
    WHERE ranked.candidate_rank = 1
      AND product_type."isActive" = true
      AND standard_category."isActive" = true
    ORDER BY ranked.similarity DESC, ranked.source_priority ASC, ranked."normalizedName" ASC
    LIMIT ${input.limit}
  `);

  return rows;
}

export type ProductClassificationCandidateInput = {
  productTypeId: number;
  source: ProductClassificationCandidateSource;
  matchedNormalizedName: string;
  similarity: number;
  rank: number;
};

export async function replaceProductClassificationCandidatesInTx(
  tx: PrismaTx,
  itemId: number,
  candidates: ProductClassificationCandidateInput[]
) {
  await tx.productClassificationCandidate.deleteMany({ where: { itemId } });
  if (candidates.length === 0) return;
  await tx.productClassificationCandidate.createMany({
    data: candidates.map((candidate) => ({ itemId, ...candidate })),
  });
}

export async function deleteProductClassificationCandidatesInTx(tx: PrismaTx, itemId: number) {
  return tx.productClassificationCandidate.deleteMany({ where: { itemId } });
}

export async function findProductClassificationCandidatesForItem(
  itemId: number,
  familyGroupId: number
) {
  return prisma.item.findFirst({
    where: { id: itemId, receipt: { familyGroupId } },
    select: {
      id: true,
      productClassificationCandidates: {
        include: { productType: true },
        orderBy: { rank: 'asc' },
      },
    },
  });
}
