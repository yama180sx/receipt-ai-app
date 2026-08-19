import { ProductClassificationAiRunStatus } from '@prisma/client';
import { prisma } from '../utils/prismaClient';

export async function createProductClassificationAiRun(input: {
  familyGroupId: number; receiptId?: number; modelId: string; promptTokens: number; candidatesTokens: number;
  totalTokens: number; targetItemCount: number; classifiedCount: number; needsReviewCount: number;
  unreturnedCount: number; status: ProductClassificationAiRunStatus; failureCode?: string; durationMs: number;
  pricingRevisionId?: number;
}) {
  return prisma.productClassificationAiRun.create({ data: input });
}
