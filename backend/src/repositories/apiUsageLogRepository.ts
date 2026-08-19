import { prisma } from '../utils/prismaClient';
import { AiUsagePurpose, Prisma } from '@prisma/client';

export async function createApiUsageLog(data: {
  familyMemberId: number | null;
  modelId: string;
  promptTokens: number;
  candidatesTokens: number;
  totalTokens: number;
  durationMs: number;
  pricingRevisionId?: number;
}) {
  return prisma.apiUsageLog.create({ data });
}

export type GlobalAiCostStatRow = {
  month: string;
  purpose: AiUsagePurpose;
  modelId: string;
  totalPromptTokens: bigint;
  totalCandidatesTokens: bigint;
  estimatedCostJpy: Prisma.Decimal;
};

/** 全世帯横断の推定額。世帯別集計とは意図的に分離する。 */
export async function queryGlobalAiCostStats(): Promise<GlobalAiCostStatRow[]> {
  return prisma.$queryRaw<GlobalAiCostStatRow[]>`
    WITH priced_usage AS (
      SELECT
        l."createdAt", p."purpose", l."modelId", l."promptTokens", l."candidatesTokens",
        p."inputPriceJpyPerMillion", p."outputPriceJpyPerMillion"
      FROM "ApiUsageLog" l
      INNER JOIN "AiPricingRevision" p ON p.id = l."pricingRevisionId"
      UNION ALL
      SELECT
        r."createdAt", p."purpose", r."modelId", r."promptTokens", r."candidatesTokens",
        p."inputPriceJpyPerMillion", p."outputPriceJpyPerMillion"
      FROM "ProductClassificationAiRun" r
      INNER JOIN "AiPricingRevision" p ON p.id = r."pricingRevisionId"
    )
    SELECT
      TO_CHAR("createdAt" AT TIME ZONE 'America/Los_Angeles', 'YYYY-MM') AS month,
      purpose,
      "modelId",
      SUM("promptTokens")::bigint AS "totalPromptTokens",
      SUM("candidatesTokens")::bigint AS "totalCandidatesTokens",
      SUM(
        ("promptTokens"::numeric * "inputPriceJpyPerMillion"
          + "candidatesTokens"::numeric * "outputPriceJpyPerMillion") / 1000000
      ) AS "estimatedCostJpy"
    FROM priced_usage
    GROUP BY month, purpose, "modelId"
    ORDER BY month DESC, purpose, "modelId";
  `;
}

export async function incrementApiUsageLogTokens(
  id: number,
  tokens: {
    promptTokens: number;
    candidatesTokens: number;
    totalTokens: number;
    selfRepairRetryCount?: number;
    durationMs?: number;
  }
) {
  return prisma.apiUsageLog.update({
    where: { id },
    data: {
      promptTokens: { increment: tokens.promptTokens },
      candidatesTokens: { increment: tokens.candidatesTokens },
      totalTokens: { increment: tokens.totalTokens },
      ...(tokens.selfRepairRetryCount
        ? { selfRepairRetryCount: { increment: tokens.selfRepairRetryCount } }
        : {}),
      ...(tokens.durationMs !== undefined
        ? { durationMs: { increment: tokens.durationMs } }
        : {}),
    },
  });
}

export async function queryAdminCostStatsByFamilyGroup(familyGroupId: number) {
  return prisma.$queryRaw<
    Array<{
      month: string;
      modelId: string;
      totalPromptTokens: number;
      totalCandidatesTokens: number;
    }>
  >`
    SELECT
      TO_CHAR(l."createdAt", 'YYYY-MM') AS month,
      l."modelId",
      SUM(l."promptTokens")::int AS "totalPromptTokens",
      SUM(l."candidatesTokens")::int AS "totalCandidatesTokens"
    FROM "ApiUsageLog" l
    INNER JOIN "FamilyMember" fm ON l."familyMemberId" = fm.id
    WHERE fm."familyGroupId" = ${familyGroupId}
    GROUP BY month, l."modelId"
    ORDER BY month DESC;
  `;
}
