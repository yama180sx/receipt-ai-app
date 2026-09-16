import { AiUsagePurpose, Prisma } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import { mapGlobalAiCostStat } from './globalAiCostService';

describe('mapGlobalAiCostStat', () => {
  it('keeps the usage type and converts Prisma aggregate values for the budget guard', () => {
    expect(mapGlobalAiCostStat({
      month: '2026-08',
      purpose: AiUsagePurpose.PRODUCT_CLASSIFICATION,
      modelId: 'gemini-test',
      totalPromptTokens: 123n,
      totalCandidatesTokens: 45n,
      estimatedCostJpy: new Prisma.Decimal('12.345678'),
    })).toEqual({
      month: '2026-08',
      purpose: AiUsagePurpose.PRODUCT_CLASSIFICATION,
      modelId: 'gemini-test',
      totalPromptTokens: 123,
      totalCandidatesTokens: 45,
      estimatedCostJpy: 12.345678,
    });
  });
});
