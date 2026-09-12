import { AiUsagePurpose, Prisma } from '@prisma/client';
import {
  queryGlobalAiCostStats,
  type GlobalAiCostStatRow,
} from '../../repositories/apiUsageLogRepository';

export type GlobalAiCostStat = {
  month: string;
  purpose: AiUsagePurpose;
  modelId: string;
  totalPromptTokens: number;
  totalCandidatesTokens: number;
  estimatedCostJpy: number;
};

function toNumber(value: number | bigint | Prisma.Decimal): number {
  return typeof value === 'bigint' ? Number(value) : Number(value);
}

export function mapGlobalAiCostStat(row: GlobalAiCostStatRow): GlobalAiCostStat {
  return {
    month: row.month,
    purpose: row.purpose,
    modelId: row.modelId,
    totalPromptTokens: toNumber(row.totalPromptTokens),
    totalCandidatesTokens: toNumber(row.totalCandidatesTokens),
    estimatedCostJpy: toNumber(row.estimatedCostJpy),
  };
}

/**
 * #124 の予算判定と専用権限付きの管理表示が利用する全体集計。
 * ここではHTTP公開を行わず、FamilyGroup境界を持つ既存集計とも混在させない。
 */
export async function getGlobalAiCostStats(): Promise<GlobalAiCostStat[]> {
  return (await queryGlobalAiCostStats()).map(mapGlobalAiCostStat);
}
