import { describe, expect, it } from 'vitest';
import { mapCategoryStatRows, mapMonthlyStatsToApi } from './statsMapper';

describe('statsMapper', () => {
  it('maps monthly stats with category fallback and receipt detail', () => {
    const result = mapMonthlyStatsToApi({
      month: '2026-01',
      totalAmount: 5000,
      stats: [
        {
          categoryId: 1,
          categoryName: null,
          color: '#fff',
          totalAmount: 5000,
        },
      ],
      latestReceipt: null,
    });

    expect(result).toEqual({
      month: '2026-01',
      totalAmount: 5000,
      stats: [
        {
          categoryId: 1,
          categoryName: '未分類',
          color: '#fff',
          totalAmount: 5000,
        },
      ],
      latestReceipt: null,
    });
  });

  it('maps category stat rows', () => {
    expect(
      mapCategoryStatRows([
        {
          categoryId: 2,
          categoryName: '食費',
          color: null,
          totalAmount: 100,
        },
      ])
    ).toEqual([
      {
        categoryId: 2,
        categoryName: '食費',
        color: null,
        totalAmount: 100,
      },
    ]);
  });
});
