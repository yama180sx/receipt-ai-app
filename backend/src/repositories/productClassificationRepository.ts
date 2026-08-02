import {
  ProductTypeStatus,
  ClassificationSource,
  ProductClassificationLearningDataType,
  ProductClassificationReclassificationItemOutcome,
  ProductClassificationReclassificationRunStatus,
  StandardProductClassificationRuleAuditAction,
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

const learningDataProductTypeSelect = {
  id: true,
  code: true,
  name: true,
  standardCategoryId: true,
} as const;

export async function findProductClassificationLearningData(familyGroupId: number) {
  const [dictionaries, histories] = await Promise.all([
    prisma.householdProductDictionary.findMany({
      where: { familyGroupId },
      include: { productType: { select: learningDataProductTypeSelect } },
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.productClassificationHistory.findMany({
      where: { familyGroupId },
      include: { productType: { select: learningDataProductTypeSelect } },
      orderBy: { updatedAt: 'desc' },
    }),
  ]);

  const events = dictionaries.length
    ? await prisma.productClassificationLearningDataAudit.findMany({
        where: {
          familyGroupId,
          learningDataType: ProductClassificationLearningDataType.HOUSEHOLD_DICTIONARY,
          learningDataId: { in: dictionaries.map((record) => record.id) },
        },
        include: { actorMember: { select: { name: true } }, familyGroup: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
      })
    : [];

  return { dictionaries, histories, events };
}

export async function deactivateProductClassificationLearningDataInTx(
  tx: PrismaTx,
  input: {
    familyGroupId: number;
    actorMemberId: number;
    type: 'household_dictionary';
    id: number;
    reason: string;
  }
) {
  const result = await tx.householdProductDictionary.updateMany({
    where: { id: input.id, familyGroupId: input.familyGroupId, isActive: true },
    data: { isActive: false },
  });

  if (result.count === 0) return null;

  const record = await tx.householdProductDictionary.findFirst({
    where: { id: input.id, familyGroupId: input.familyGroupId },
    include: { productType: { select: learningDataProductTypeSelect } },
  });
  if (!record) return null;

  const audit = await tx.productClassificationLearningDataAudit.create({
    data: {
      familyGroupId: input.familyGroupId,
      actorMemberId: input.actorMemberId,
      learningDataType: ProductClassificationLearningDataType.HOUSEHOLD_DICTIONARY,
      learningDataId: record.id,
      normalizedName: record.normalizedName,
      productTypeId: record.productTypeId,
      productTypeName: record.productType.name,
      reason: input.reason,
    },
    include: { actorMember: { select: { name: true } }, familyGroup: { select: { name: true } } },
  });

  return { record, audit };
}

export type ProductSimilarityCandidateSource =
  | 'history'
  | 'household_dictionary'
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
        standard."normalizedKeyword" AS "normalizedName",
        standard."productTypeId",
        'standard_dictionary'::text AS source,
        3 AS source_priority,
        similarity(standard."normalizedKeyword", ${input.normalizedName}) AS similarity
      FROM "StandardProductClassificationRule" AS standard
      WHERE standard."isActive" = true
        AND standard."normalizedKeyword" % ${input.normalizedName}
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

export type ProductClassificationReviewQuery = {
  familyGroupId: number;
  statuses: ProductTypeStatus[];
  categoryId?: number;
  startDate?: Date;
  endDate?: Date;
};

export async function findProductClassificationReviewItems(query: ProductClassificationReviewQuery) {
  return prisma.item.findMany({
    where: {
      productTypeStatus: { in: query.statuses },
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      receipt: {
        familyGroupId: query.familyGroupId,
        ...(query.startDate && query.endDate ? { date: { gte: query.startDate, lt: query.endDate } } : {}),
      },
    },
    include: {
      category: true,
      productType: true,
      receipt: { select: { id: true, date: true, storeName: true } },
    },
    orderBy: [{ receipt: { date: 'desc' } }, { id: 'asc' }],
  });
}

export async function findProductClassificationStatsItems(
  familyGroupId: number,
  startDate: Date,
  endDate: Date
) {
  return prisma.item.findMany({
    where: { receipt: { familyGroupId, date: { gte: startDate, lt: endDate } } },
    select: {
      price: true,
      quantity: true,
      productTypeStatus: true,
      productType: {
        select: {
          id: true,
          name: true,
          standardCategory: { select: { id: true, name: true, parent: { select: { name: true } } } },
        },
      },
    },
  });
}

export type ProductClassificationReclassificationQuery = {
  familyGroupId: number;
  statuses: ProductTypeStatus[];
  startDate?: Date;
  endDate?: Date;
  limit: number;
};

export async function findItemsForProductClassificationReclassification(
  query: ProductClassificationReclassificationQuery
) {
  return prisma.item.findMany({
    where: {
      productTypeStatus: { in: query.statuses },
      receipt: {
        familyGroupId: query.familyGroupId,
        ...(query.startDate ? { date: { gte: query.startDate } } : {}),
        ...(query.endDate ? { date: { lt: query.endDate } } : {}),
      },
    },
    select: { id: true },
    orderBy: [{ receipt: { date: 'asc' } }, { id: 'asc' }],
    take: query.limit,
  });
}

export async function findItemForProductClassificationReclassificationInTx(
  tx: PrismaTx,
  itemId: number,
  familyGroupId: number
) {
  return tx.item.findFirst({
    where: { id: itemId, receipt: { familyGroupId } },
    include: {
      receipt: { select: { familyGroupId: true } },
      productClassificationCandidates: {
        select: {
          productTypeId: true,
          source: true,
          matchedNormalizedName: true,
          similarity: true,
          rank: true,
        },
        orderBy: { rank: 'asc' },
      },
    },
  });
}

export async function createProductClassificationReclassificationRun(
  input: {
    familyGroupId: number;
    actorMemberId: number;
    targetStatuses: ProductTypeStatus[];
    startDate?: Date;
    endDate?: Date;
    limit: number;
    selectedCount: number;
  }
) {
  return prisma.productClassificationReclassificationRun.create({
    data: {
      ...input,
      status: ProductClassificationReclassificationRunStatus.COMPLETED,
    },
  });
}

export async function createProductClassificationReclassificationItemAuditInTx(
  tx: PrismaTx,
  input: {
    runId: number;
    itemId: number;
    outcome: ProductClassificationReclassificationItemOutcome;
    previousCategoryId: number | null;
    nextCategoryId: number | null;
    previousStandardCategoryId: number | null;
    nextStandardCategoryId: number | null;
    previousProductTypeId: number | null;
    nextProductTypeId: number | null;
    previousProductTypeStatus: ProductTypeStatus;
    nextProductTypeStatus: ProductTypeStatus;
    previousClassificationSource: ClassificationSource | null;
    nextClassificationSource: ClassificationSource | null;
    errorMessage?: string;
  }
) {
  return tx.productClassificationReclassificationItemAudit.create({ data: input });
}

export async function completeProductClassificationReclassificationRun(
  runId: number,
  input: {
    updatedCount: number;
    unchangedCount: number;
    failedCount: number;
    status: ProductClassificationReclassificationRunStatus;
  }
) {
  return prisma.productClassificationReclassificationRun.update({
    where: { id: runId },
    data: { ...input, completedAt: new Date() },
    include: { itemAudits: { orderBy: { id: 'asc' } } },
  });
}

const standardRuleInclude = {
  productType: { select: { id: true, code: true, name: true, standardCategoryId: true } },
  createdByMember: { select: { name: true } },
  updatedByMember: { select: { name: true } },
} as const;

export async function findStandardProductClassificationRules(includeInactive: boolean) {
  return prisma.standardProductClassificationRule.findMany({
    where: includeInactive ? {} : { isActive: true },
    include: standardRuleInclude,
    orderBy: [{ isActive: 'desc' }, { priority: 'asc' }, { id: 'asc' }],
  });
}

export async function findStandardRulePreviewItems(familyGroupId: number, normalizedKeyword: string) {
  const where = { normalizedName: { contains: normalizedKeyword }, receipt: { familyGroupId } };
  const [matchedCount, items] = await Promise.all([
    prisma.item.count({ where }),
    prisma.item.findMany({
    where,
    select: { id: true, name: true, normalizedName: true },
    orderBy: { id: 'desc' },
      take: 10,
    }),
  ]);
  return { matchedCount, items };
}

export async function createStandardProductClassificationRuleInTx(
  tx: PrismaTx,
  input: { normalizedKeyword: string; productTypeId: number; priority: number; reason: string; actorMemberId: number }
) {
  const productType = await findActiveProductTypeWithCategoryInTx(tx, input.productTypeId);
  if (!productType) return null;
  const rule = await tx.standardProductClassificationRule.create({
    data: {
      normalizedKeyword: input.normalizedKeyword,
      standardCategoryId: productType.standardCategoryId,
      productTypeId: input.productTypeId,
      priority: input.priority,
      lastChangeReason: input.reason,
      createdByMemberId: input.actorMemberId,
      updatedByMemberId: input.actorMemberId,
    },
    include: standardRuleInclude,
  });
  await tx.standardProductClassificationRuleAudit.create({
    data: { ruleId: rule.id, action: StandardProductClassificationRuleAuditAction.CREATED, actorMemberId: input.actorMemberId, normalizedKeyword: rule.normalizedKeyword, productTypeId: rule.productTypeId, productTypeName: rule.productType.name, priority: rule.priority, isActive: rule.isActive, reason: input.reason },
  });
  return rule;
}

export async function updateStandardProductClassificationRuleInTx(
  tx: PrismaTx,
  id: number,
  input: { normalizedKeyword: string; productTypeId: number; priority: number; reason: string; actorMemberId: number }
) {
  const productType = await findActiveProductTypeWithCategoryInTx(tx, input.productTypeId);
  if (!productType) return null;
  const exists = await tx.standardProductClassificationRule.findUnique({ where: { id } });
  if (!exists) return null;
  const rule = await tx.standardProductClassificationRule.update({
    where: { id },
    data: { normalizedKeyword: input.normalizedKeyword, standardCategoryId: productType.standardCategoryId, productTypeId: input.productTypeId, priority: input.priority, lastChangeReason: input.reason, updatedByMemberId: input.actorMemberId },
    include: standardRuleInclude,
  });
  await tx.standardProductClassificationRuleAudit.create({
    data: { ruleId: rule.id, action: StandardProductClassificationRuleAuditAction.UPDATED, actorMemberId: input.actorMemberId, normalizedKeyword: rule.normalizedKeyword, productTypeId: rule.productTypeId, productTypeName: rule.productType.name, priority: rule.priority, isActive: rule.isActive, reason: input.reason },
  });
  return rule;
}

export async function deactivateStandardProductClassificationRuleInTx(
  tx: PrismaTx, id: number, actorMemberId: number, reason: string
) {
  const rule = await tx.standardProductClassificationRule.updateMany({ where: { id, isActive: true }, data: { isActive: false, lastChangeReason: reason, updatedByMemberId: actorMemberId } });
  if (!rule.count) return null;
  const updated = await tx.standardProductClassificationRule.findUnique({ where: { id }, include: standardRuleInclude });
  if (!updated) return null;
  await tx.standardProductClassificationRuleAudit.create({
    data: { ruleId: updated.id, action: StandardProductClassificationRuleAuditAction.DEACTIVATED, actorMemberId, normalizedKeyword: updated.normalizedKeyword, productTypeId: updated.productTypeId, productTypeName: updated.productType.name, priority: updated.priority, isActive: false, reason },
  });
  return updated;
}
