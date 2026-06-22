import { prisma } from '../utils/prismaClient';

export async function createApiUsageLog(data: {
  familyMemberId: number | null;
  modelId: string;
  promptTokens: number;
  candidatesTokens: number;
  totalTokens: number;
}) {
  return prisma.apiUsageLog.create({ data });
}

export async function incrementApiUsageLogTokens(
  id: number,
  tokens: {
    promptTokens: number;
    candidatesTokens: number;
    totalTokens: number;
  }
) {
  return prisma.apiUsageLog.update({
    where: { id },
    data: {
      promptTokens: { increment: tokens.promptTokens },
      candidatesTokens: { increment: tokens.candidatesTokens },
      totalTokens: { increment: tokens.totalTokens },
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
