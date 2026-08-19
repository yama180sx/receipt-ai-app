import {
  AiUsagePurpose,
  ClassificationConfidence,
  ClassificationSource,
  ProductTypeStatus,
  ProductClassificationAiRunStatus,
} from '@prisma/client';
import { Prisma } from '@prisma/client';
import { classifyProductsWithAi } from '../../ai';
import { getConfiguredProductClassificationModelId } from '../../ai/geminiProductClassificationProvider';
import { ProductClassificationResponseValidationError } from '../../ai/productClassificationContract';
import { createProductClassificationAiRun } from '../../repositories/productClassificationAiRunRepository';
import { findEffectiveAiPricingRevision } from '../../repositories/aiPricingRevisionRepository';
import { releaseAiBudgetReservation, reserveAiBudget } from '../aiBudget/aiBudgetGuardService';
import logger from '../../utils/logger';
import { getHttpStatusFromError, getNodeErrorCode } from '../../utils/httpError';
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
 * 秘密値やGeminiの生レスポンスを監査へ残さず、再発時に切り分けられる固定コードだけを返す。
 */
function toSafeProviderFailureCode(error: unknown): string {
  if (error instanceof ProductClassificationResponseValidationError) return 'response_validation';

  const status = getHttpStatusFromError(error);
  if (status !== undefined) return `http_${status}`;

  const nodeErrorCode = getNodeErrorCode(error);
  if (nodeErrorCode) return `network_${nodeErrorCode.toLowerCase()}`;

  const message = error instanceof Error ? error.message : '';
  if (message.includes('PRODUCT_CLASSIFICATION') && message.includes('見つかりません')) {
    return 'prompt_not_found';
  }
  return 'provider_error';
}

/**
 * 保存済みで候補を持つ要確認明細へ分類AIを適用する。
 * 外部AIの障害・不正応答はここで吸収し、既に保存したレシートを失敗させない。
 */
export async function applyProductClassificationAiToItems(
  familyGroupId: number,
  itemIds: number[]
): Promise<void> {
  const startedAt = Date.now();
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

  let pricingRevision;
  try {
    pricingRevision = await findEffectiveAiPricingRevision(
      AiUsagePurpose.PRODUCT_CLASSIFICATION,
      getConfiguredProductClassificationModelId()
    );
  } catch (error) {
    // #124 の有効化後はガードがフェイルクローズする。先行導入中は既存分類を止めない。
    logger.error('[ProductClassificationAI] AI単価改定の取得に失敗しました。');
  }

  const jobKey = `product-classification:${targets[0].receipt.id}:${Math.random()}`;
  const maxCostJpy = pricingRevision
    ? new Prisma.Decimal(pricingRevision.maxInputTokens).mul(pricingRevision.inputPriceJpyPerMillion)
      .plus(new Prisma.Decimal(pricingRevision.maxOutputTokens).mul(pricingRevision.outputPriceJpyPerMillion)).div(1_000_000)
    : new Prisma.Decimal(0);
  // OCRと同じく、予算有効時は単価未解決を安全側で拒否する。
  try {
    await reserveAiBudget({ purpose: AiUsagePurpose.PRODUCT_CLASSIFICATION, pricingRevisionId: pricingRevision?.id, maxCostJpy, jobKey });
  } catch (error) {
    await createProductClassificationAiRun({ familyGroupId, receiptId: targets[0].receipt.id, modelId: getConfiguredProductClassificationModelId(), promptTokens: 0, candidatesTokens: 0, totalTokens: 0, targetItemCount: targets.length, classifiedCount: 0, needsReviewCount: 0, unreturnedCount: targets.length, status: ProductClassificationAiRunStatus.PROVIDER_ERROR, failureCode: toSafeProviderFailureCode(error), durationMs: Date.now() - startedAt, pricingRevisionId: pricingRevision?.id }).catch(() => undefined);
    logger.warn('[ProductClassificationAI] 全体AI予算により分類を見送りました。');
    return;
  }
  let aiResult;
  try {
    aiResult = await classifyProductsWithAi({
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
    const isInvalidResponse = error instanceof ProductClassificationResponseValidationError;
    await createProductClassificationAiRun({
      familyGroupId,
      receiptId: targets[0].receipt.id,
      modelId: getConfiguredProductClassificationModelId(),
      promptTokens: 0,
      candidatesTokens: 0,
      totalTokens: 0,
      targetItemCount: targets.length,
      classifiedCount: 0,
      needsReviewCount: 0,
      unreturnedCount: 0,
      status: isInvalidResponse ? ProductClassificationAiRunStatus.INVALID_RESPONSE : ProductClassificationAiRunStatus.PROVIDER_ERROR,
      failureCode: toSafeProviderFailureCode(error),
      durationMs: Date.now() - startedAt,
      pricingRevisionId: pricingRevision?.id,
    }).catch(() => undefined);
    logger.warn('[ProductClassificationAI] 分類AIを適用できませんでした。類似候補の要確認状態を維持します。', {
      familyGroupId,
      itemIds: targets.map((item) => item.id),
      error: error instanceof Error ? error.message : String(error),
    });
    await releaseAiBudgetReservation(jobKey);
    return;
  }

  try {
    await runInTransaction(async (tx) => {
      for (const result of aiResult.response.items) {
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
    const returnedIds = new Set(aiResult.response.items.map((item) => item.itemId));
    const classifiedCount = aiResult.response.items.filter((item) => item.productTypeId !== null && item.confidence === 'high').length;
    await createProductClassificationAiRun({ familyGroupId, receiptId: targets[0].receipt.id, modelId: aiResult.modelId, ...aiResult.usage, targetItemCount: targets.length, classifiedCount, needsReviewCount: aiResult.response.items.length - classifiedCount, unreturnedCount: targets.length - returnedIds.size, status: ProductClassificationAiRunStatus.SUCCEEDED, durationMs: Date.now() - startedAt, pricingRevisionId: pricingRevision?.id }).catch(() => undefined);
  } catch (error) {
    await createProductClassificationAiRun({ familyGroupId, receiptId: targets[0].receipt.id, modelId: aiResult.modelId, ...aiResult.usage, targetItemCount: targets.length, classifiedCount: 0, needsReviewCount: 0, unreturnedCount: 0, status: ProductClassificationAiRunStatus.PERSISTENCE_ERROR, failureCode: 'persistence_error', durationMs: Date.now() - startedAt, pricingRevisionId: pricingRevision?.id }).catch(() => undefined);
    logger.warn('[ProductClassificationAI] AI分類結果を保存できませんでした。類似候補の要確認状態を維持します。', {
      familyGroupId,
      itemIds: targets.map((item) => item.id),
      error: error instanceof Error ? error.message : String(error),
    });
  } finally { await releaseAiBudgetReservation(jobKey); }
}

/** 単一明細の更新後に、AI反映後の表示用データを取得する。 */
export async function findItemAfterProductClassificationAi(itemId: number) {
  return findItemById(itemId);
}
