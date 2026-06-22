import { describe, expect, it } from 'vitest';
import { mapAdminCostStatsToApi, mapPromptTemplateToApi } from './adminMapper';

describe('adminMapper', () => {
  it('maps prompt template without internal timestamps', () => {
    expect(
      mapPromptTemplateToApi({
        id: 1,
        familyGroupId: 2,
        key: 'RECEIPT_ANALYSIS',
        name: '解析',
        description: 'desc',
        systemPrompt: 'prompt',
        domainHints: { tax: true },
        isActive: true,
        version: 3,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-02T00:00:00.000Z'),
      })
    ).toEqual({
      id: 1,
      familyGroupId: 2,
      key: 'RECEIPT_ANALYSIS',
      name: '解析',
      description: 'desc',
      systemPrompt: 'prompt',
      domainHints: { tax: true },
      isActive: true,
      version: 3,
    });
  });

  it('passes through admin cost stats domain rows', () => {
    const rows = [
      {
        month: '2026-01',
        modelId: 'gemini',
        totalPromptTokens: 100,
        totalCandidatesTokens: 50,
        estimatedCostJpy: 12.34,
      },
    ];

    expect(mapAdminCostStatsToApi(rows)).toEqual(rows);
  });
});
