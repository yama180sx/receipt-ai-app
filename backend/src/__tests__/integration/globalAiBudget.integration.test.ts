import { AiUsagePurpose, ProductClassificationAiRunStatus } from '@prisma/client';
import { afterEach, describe, expect, it } from 'vitest';
import { queryGlobalAiCostStats } from '../../repositories/apiUsageLogRepository';
import { prisma } from '../../utils/prismaClient';
import { shouldRunDbIntegration } from './helpers/integrationHelpers';

// 実利用ログと混ざらない、テスト実行ごとに一意なモデルID。実値・秘密情報は保存しない。
const modelId = `integration-ai-budget-${Date.now()}`;
const createdAt = new Date('2026-09-01T12:00:00.000Z');

describe.skipIf(!shouldRunDbIntegration())('Global AI budget aggregate (Issue #126)', () => {
  afterEach(async () => {
    await prisma.apiUsageLog.deleteMany({ where: { modelId } });
    await prisma.productClassificationAiRun.deleteMany({ where: { modelId } });
    await prisma.aiPricingRevision.deleteMany({ where: { modelId } });
  });

  it('aggregates OCR and product-classification usage with their own price revisions', async () => {
    const [ocrPricing, classificationPricing] = await Promise.all([
      prisma.aiPricingRevision.create({
        data: {
          purpose: AiUsagePurpose.OCR,
          modelId,
          inputPriceJpyPerMillion: 100,
          outputPriceJpyPerMillion: 200,
          maxInputTokens: 1_000_000,
          maxOutputTokens: 1_000_000,
          effectiveFrom: createdAt,
          sourceUrl: 'https://example.invalid/integration-test',
          verifiedAt: createdAt,
          verifiedBy: 'integration-test',
        },
      }),
      prisma.aiPricingRevision.create({
        data: {
          purpose: AiUsagePurpose.PRODUCT_CLASSIFICATION,
          modelId,
          inputPriceJpyPerMillion: 300,
          outputPriceJpyPerMillion: 400,
          maxInputTokens: 1_000_000,
          maxOutputTokens: 1_000_000,
          effectiveFrom: createdAt,
          sourceUrl: 'https://example.invalid/integration-test',
          verifiedAt: createdAt,
          verifiedBy: 'integration-test',
        },
      }),
    ]);

    await prisma.apiUsageLog.create({
      data: {
        familyMemberId: 1,
        modelId,
        promptTokens: 1_000_000,
        candidatesTokens: 1_000_000,
        totalTokens: 2_000_000,
        durationMs: 1,
        pricingRevisionId: ocrPricing.id,
        createdAt,
      },
    });
    await prisma.productClassificationAiRun.create({
      data: {
        familyGroupId: 1,
        modelId,
        promptTokens: 1_000_000,
        candidatesTokens: 1_000_000,
        totalTokens: 2_000_000,
        targetItemCount: 1,
        status: ProductClassificationAiRunStatus.SUCCEEDED,
        durationMs: 1,
        pricingRevisionId: classificationPricing.id,
        createdAt,
      },
    });

    const rows = (await queryGlobalAiCostStats())
      .filter((row) => row.modelId === modelId)
      .map((row) => ({
        month: row.month,
        purpose: row.purpose,
        estimatedCostJpy: row.estimatedCostJpy.toString(),
      }));

    expect(rows).toEqual([
      { month: '2026-09', purpose: AiUsagePurpose.OCR, estimatedCostJpy: '300' },
      { month: '2026-09', purpose: AiUsagePurpose.PRODUCT_CLASSIFICATION, estimatedCostJpy: '700' },
    ]);
  });
});
