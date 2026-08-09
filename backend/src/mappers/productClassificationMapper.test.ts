import { describe, expect, it } from 'vitest';
import { mapProductTypesToSummary } from './productClassificationMapper';

describe('mapProductTypesToSummary', () => {
  it('maps only the product type fields exposed by the API', () => {
    const result = mapProductTypesToSummary([
      {
        id: 11,
        code: 'milk',
        name: '牛乳',
        standardCategoryId: 4,
        displayOrder: 1,
        isActive: true,
      },
    ]);

    expect(result).toEqual([
      { id: 11, code: 'milk', name: '牛乳', standardCategoryId: 4 },
    ]);
  });
});
