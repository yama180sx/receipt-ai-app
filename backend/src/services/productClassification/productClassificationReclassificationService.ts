import {
  ProductClassificationReclassificationItemOutcome,
  ProductClassificationReclassificationRunStatus,
  ProductTypeStatus,
} from '@prisma/client';
import { runInTransaction, type PrismaTx } from '../../utils/prismaTransaction';
import { updateItemCategoryInTx } from '../../repositories/receiptRepository';
import {
  completeProductClassificationReclassificationRun,
  createProductClassificationReclassificationItemAuditInTx,
  createProductClassificationReclassificationRun,
  findItemForProductClassificationReclassificationInTx,
  findItemsForProductClassificationReclassification,
  replaceProductClassificationCandidatesInTx,
} from '../../repositories/productClassificationRepository';
import {
  classifyItemWithSimilarityCandidates,
  toProductClassificationCandidateInputs,
} from './productClassificationService';

const reclassifiableStatuses = new Set<ProductTypeStatus>([
  ProductTypeStatus.UNCLASSIFIED,
  ProductTypeStatus.NEEDS_REVIEW,
]);

export type ProductClassificationReclassificationInput = {
  statuses: ProductTypeStatus[];
  startDate?: Date;
  endDate?: Date;
  limit: number;
};

type ReclassificationCounts = {
  updatedCount: number;
  unchangedCount: number;
  failedCount: number;
};

function classificationChanged(
  current: {
    categoryId: number | null;
    standardCategoryId: number | null;
    productTypeId: number | null;
    productTypeStatus: ProductTypeStatus;
    classificationSource: unknown;
    classificationConfidence: unknown;
  },
  next: {
    categoryId: number | null;
    standardCategoryId: number | null;
    productTypeId: number | null;
    productTypeStatus: ProductTypeStatus;
    classificationSource: unknown;
    classificationConfidence: unknown;
  }
) {
  return current.categoryId !== next.categoryId
    || current.standardCategoryId !== next.standardCategoryId
    || current.productTypeId !== next.productTypeId
    || current.productTypeStatus !== next.productTypeStatus
    || current.classificationSource !== next.classificationSource
    || current.classificationConfidence !== next.classificationConfidence;
}

function candidatesChanged(
  current: Array<{
    productTypeId: number;
    source: unknown;
    matchedNormalizedName: string;
    similarity: number;
    rank: number;
  }>,
  next: ReturnType<typeof toProductClassificationCandidateInputs>
) {
  return current.length !== next.length || current.some((candidate, index) => {
    const nextCandidate = next[index];
    return !nextCandidate
      || candidate.productTypeId !== nextCandidate.productTypeId
      || candidate.source !== nextCandidate.source
      || candidate.matchedNormalizedName !== nextCandidate.matchedNormalizedName
      || candidate.similarity !== nextCandidate.similarity
      || candidate.rank !== nextCandidate.rank;
  });
}

async function reclassifyItemInTx(
  tx: PrismaTx,
  runId: number,
  itemId: number,
  familyGroupId: number
): Promise<'updated' | 'unchanged'> {
  const item = await findItemForProductClassificationReclassificationInTx(tx, itemId, familyGroupId);
  if (!item || !reclassifiableStatuses.has(item.productTypeStatus)) return 'unchanged';

  const { classification, candidates } = await classifyItemWithSimilarityCandidates(tx, {
    familyGroupId,
    itemName: item.name,
    price: item.price,
    categoryId: item.categoryId,
  });
  const candidateInputs = toProductClassificationCandidateInputs(candidates);
  const hasClassificationChanged = classificationChanged(item, classification);
  const hasCandidatesChanged = candidatesChanged(item.productClassificationCandidates, candidateInputs);

  if (!hasClassificationChanged && !hasCandidatesChanged) return 'unchanged';

  await updateItemCategoryInTx(tx, itemId, classification);
  await replaceProductClassificationCandidatesInTx(tx, itemId, candidateInputs);
  await createProductClassificationReclassificationItemAuditInTx(tx, {
    runId,
    itemId,
    outcome: ProductClassificationReclassificationItemOutcome.UPDATED,
    previousCategoryId: item.categoryId,
    nextCategoryId: classification.categoryId,
    previousStandardCategoryId: item.standardCategoryId,
    nextStandardCategoryId: classification.standardCategoryId,
    previousProductTypeId: item.productTypeId,
    nextProductTypeId: classification.productTypeId,
    previousProductTypeStatus: item.productTypeStatus,
    nextProductTypeStatus: classification.productTypeStatus,
    previousClassificationSource: item.classificationSource,
    nextClassificationSource: classification.classificationSource,
  });
  return 'updated';
}

async function recordFailedItem(
  runId: number,
  itemId: number,
  familyGroupId: number,
  error: unknown
) {
  const message = error instanceof Error ? error.message.slice(0, 500) : 'Reclassification failed';
  await runInTransaction(async (tx) => {
    const item = await findItemForProductClassificationReclassificationInTx(tx, itemId, familyGroupId);
    if (!item) return;
    await createProductClassificationReclassificationItemAuditInTx(tx, {
      runId,
      itemId,
      outcome: ProductClassificationReclassificationItemOutcome.FAILED,
      previousCategoryId: item.categoryId,
      nextCategoryId: item.categoryId,
      previousStandardCategoryId: item.standardCategoryId,
      nextStandardCategoryId: item.standardCategoryId,
      previousProductTypeId: item.productTypeId,
      nextProductTypeId: item.productTypeId,
      previousProductTypeStatus: item.productTypeStatus,
      nextProductTypeStatus: item.productTypeStatus,
      previousClassificationSource: item.classificationSource,
      nextClassificationSource: item.classificationSource,
      errorMessage: message,
    });
  });
}

/**
 * 未確定の既存明細だけを、通常取込と同じ完全一致・類似候補の規則で再評価する。
 * 明細ごとにトランザクションを分け、1件の失敗で他の再分類結果を失わない。
 */
export async function reclassifyProductClassificationItems(
  familyGroupId: number,
  actorMemberId: number,
  input: ProductClassificationReclassificationInput
) {
  const statuses = input.statuses.filter((status) => reclassifiableStatuses.has(status));
  const targets = await findItemsForProductClassificationReclassification({
    familyGroupId,
    statuses,
    startDate: input.startDate,
    endDate: input.endDate,
    limit: input.limit,
  });
  const run = await createProductClassificationReclassificationRun({
    familyGroupId,
    actorMemberId,
    targetStatuses: statuses,
    startDate: input.startDate,
    endDate: input.endDate,
    limit: input.limit,
    selectedCount: targets.length,
  });
  const counts: ReclassificationCounts = { updatedCount: 0, unchangedCount: 0, failedCount: 0 };

  for (const target of targets) {
    try {
      const outcome = await runInTransaction((tx) =>
        reclassifyItemInTx(tx, run.id, target.id, familyGroupId)
      );
      if (outcome === 'updated') counts.updatedCount += 1;
      else counts.unchangedCount += 1;
    } catch (error) {
      counts.failedCount += 1;
      try {
        await recordFailedItem(run.id, target.id, familyGroupId, error);
      } catch {
        // 元の失敗を隠さず、runのfailedCountで確認できるようにする。
      }
    }
  }

  return completeProductClassificationReclassificationRun(run.id, {
    ...counts,
    status: counts.failedCount > 0
      ? ProductClassificationReclassificationRunStatus.PARTIAL_FAILURE
      : ProductClassificationReclassificationRunStatus.COMPLETED,
  });
}
