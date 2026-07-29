import {
  ClassificationConfidence,
  ClassificationSource,
  ProductTypeStatus,
} from '@prisma/client';
import { classifyProductsWithAi } from '../../ai';
import logger from '../../utils/logger';
import { runInTransaction } from '../../utils/prismaTransaction';
import {
  findItemById,
  findProductClassificationAiTargetInTx,
  findProductClassificationAiTargets,
  updateItemProductClassificationInTx,
} from '../../repositories/receiptRepository';
import {
  findActiveProductTypeWithCategoryInTx,
  findCategoryForProductTypeInTx,
} from '../../repositories/productClassificationRepository';

const confidenceMap = {
  high: ClassificationConfidence.HIGH,
  medium: ClassificationConfidence.MEDIUM,
  low: ClassificationConfidence.LOW,
} as const;

/**
 * 保存済みで候補を持つ要確認明細へ分類AIを適用する。
 * 外部AIの障害・不正応答はここで吸収し、既に保存したレシートを失敗させない。
 */
export async function applyProductClassificationAiToItems(
  familyGroupId: number,
  itemIds: number[]
): Promise<void> {
  let targets;
  try {
    targets = await findProductClassificationAiTargets(itemIds, familyGroupId);
  } catch (error) {
    logger.warn('[ProductClassificationAI] AI分類対象を取得できませんでした。レシート保存は継続します。', {
      familyGroupId,
      itemIds,
      error: error instanceof Error ? error.message : String(error),
    });
    return;
  }
  if (targets.length === 0) return;

  let response;
  try {
    response = await classifyProductsWithAi({
      familyGroupId,
      storeName: targets[0].receipt.storeName,
      items: targets.map((item) => ({
        itemId: item.id,
        itemName: item.name,
        normalizedName: item.normalizedName,
        candidates: item.productClassificationCandidates.map((candidate) => ({
          productTypeId: candidate.productTypeId,
          name: candidate.productType.name,
          standardCategoryName: candidate.productType.standardCategory.name,
        })),
      })),
    });
  } catch (error) {
    logger.warn('[ProductClassificationAI] 分類AIを適用できませんでした。類似候補の要確認状態を維持します。', {
      familyGroupId,
      itemIds: targets.map((item) => item.id),
      error: error instanceof Error ? error.message : String(error),
    });
    return;
  }

  try {
    await runInTransaction(async (tx) => {
      for (const result of response.items) {
        // AI呼出中の手動修正・再編集を上書きしないよう、状態と候補を再確認する。
        const item = await findProductClassificationAiTargetInTx(tx, result.itemId, familyGroupId);
        if (!item) continue;

        if (result.productTypeId !== null && result.confidence === 'high') {
          const isCurrentCandidate = item.productClassificationCandidates.some(
            (candidate) => candidate.productTypeId === result.productTypeId
          );
          if (!isCurrentCandidate) continue;

          const productType = await findActiveProductTypeWithCategoryInTx(tx, result.productTypeId);
          if (!productType) continue;

          const rootCategoryName =
            productType.standardCategory.parent?.name ?? productType.standardCategory.name;
          const category = await findCategoryForProductTypeInTx(tx, familyGroupId, rootCategoryName);
          if (!category) {
            logger.warn('[ProductClassificationAI] 対応する世帯カテゴリがないため自動確定を見送ります。', {
              familyGroupId,
              itemId: item.id,
              productTypeId: productType.id,
            });
            continue;
          }

          await updateItemProductClassificationInTx(tx, item.id, {
            categoryId: category.id,
            standardCategoryId: productType.standardCategoryId,
            productTypeId: productType.id,
            productTypeStatus: ProductTypeStatus.CLASSIFIED,
            classificationSource: ClassificationSource.AI,
            classificationConfidence: ClassificationConfidence.HIGH,
          });
          continue;
        }

        // medium / low / null は候補を保持し、ユーザー確認対象のままとする。
        await updateItemProductClassificationInTx(tx, item.id, {
          categoryId: item.categoryId,
          standardCategoryId: null,
          productTypeId: null,
          productTypeStatus: ProductTypeStatus.NEEDS_REVIEW,
          classificationSource: ClassificationSource.AI,
          classificationConfidence: confidenceMap[result.confidence],
        });
      }
    });
  } catch (error) {
    logger.warn('[ProductClassificationAI] AI分類結果を保存できませんでした。類似候補の要確認状態を維持します。', {
      familyGroupId,
      itemIds: targets.map((item) => item.id),
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/** 単一明細の更新後に、AI反映後の表示用データを取得する。 */
export async function findItemAfterProductClassificationAi(itemId: number) {
  return findItemById(itemId);
}
