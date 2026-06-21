import { describe, expect, it } from 'vitest';
import {
  mapAdvancedStatsResponse,
  mapCategoryList,
  mapMonthlyStatsResponse,
} from './statsMapper';

describe('statsMapper', () => {
  it('mapMonthlyStatsResponse normalizes MonthlyStatsData DTO', () => {
    const result = mapMonthlyStatsResponse(
      {
        month: '2026-06',
        totalAmount: 12000,
        stats: [
          {
            categoryId: 1,
            categoryName: '食費',
            totalAmount: '5000',
            color: '#ff0000',
          },
        ],
        latestReceipt: null,
      },
      '2026-06'
    );

    expect(result).toEqual({
      month: '2026-06',
      totalAmount: 12000,
      prevTotal: 0,
      diffAmount: 0,
      diffPercentage: 0,
      stats: [
        {
          categoryId: 1,
          categoryName: '食費',
          totalAmount: 5000,
          color: '#ff0000',
        },
      ],
      latestReceipt: null,
    });
  });

  it('mapMonthlyStatsResponse handles legacy array payload with total field', () => {
    const result = mapMonthlyStatsResponse(
      [
        {
          month: '2026-05',
          total: 8000,
          stats: [],
          latestReceipt: null,
        },
        {
          month: '2026-06',
          total: 10000,
          stats: [{ categoryName: '未分類', totalAmount: 10000 }],
          latestReceipt: null,
        },
      ],
      '2026-06'
    );

    expect(result?.month).toBe('2026-06');
    expect(result?.totalAmount).toBe(10000);
    expect(result?.stats[0]?.categoryName).toBe('未分類');
  });

  it('mapAdvancedStatsResponse maps snake_case pareto fields', () => {
    const result = mapAdvancedStatsResponse({
      trend: [{ period: '2026-06', total: 1000, prev_total: 800 }],
      pareto: [{ name: '食費', amount: 500, ratio: 50, cumulative_ratio: 50 }],
    });

    expect(result).toEqual({
      trend: [{ period: '2026-06', total: 1000, prevTotal: 800 }],
      pareto: [{ name: '食費', amount: 500, ratio: 50, cumulativeRatio: 50 }],
    });
  });

  it('mapCategoryList keeps id, name, color only', () => {
    const result = mapCategoryList([
      { id: 1, name: '食費', color: '#111111', familyGroupId: 1, keywords: [] },
    ]);

    expect(result).toEqual([{ id: 1, name: '食費', color: '#111111' }]);
  });
});
