import { AiUsagePurpose } from '@prisma/client';
import { prisma } from '../utils/prismaClient';

/**
 * 呼出し開始時点で有効な単価改定を返す。
 * 集計時はこのIDを使うため、後から日時で単価を再推測しない。
 */
export async function findEffectiveAiPricingRevision(
  purpose: AiUsagePurpose,
  modelId: string,
  at: Date = new Date()
) {
  return prisma.aiPricingRevision.findFirst({
    where: { purpose, modelId, effectiveFrom: { lte: at } },
    orderBy: { effectiveFrom: 'desc' },
  });
}
