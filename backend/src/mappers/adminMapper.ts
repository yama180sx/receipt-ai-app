import type { PromptTemplate as PromptTemplateRecord } from '@prisma/client';
import type { AdminCostStatRow, PromptTemplate } from '../types/apiSchemas';

export function mapPromptTemplateToApi(record: PromptTemplateRecord): PromptTemplate {
  return {
    id: record.id,
    key: record.key,
    name: record.name,
    description: record.description,
    systemPrompt: record.systemPrompt,
    domainHints:
      record.domainHints && typeof record.domainHints === 'object'
        ? (record.domainHints as Record<string, unknown>)
        : null,
    isActive: record.isActive,
    version: record.version,
    familyGroupId: record.familyGroupId,
  };
}

export function mapPromptTemplateList(records: PromptTemplateRecord[]): PromptTemplate[] {
  return records.map(mapPromptTemplateToApi);
}

export type AdminCostStatDomain = {
  month: string;
  modelId: string;
  totalPromptTokens: number;
  totalCandidatesTokens: number;
  estimatedCostJpy: number;
};

export function mapAdminCostStatsToApi(stats: AdminCostStatDomain[]): AdminCostStatRow[] {
  return stats;
}
