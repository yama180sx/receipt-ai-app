import { describe, expect, it } from 'vitest';
import { getProductClassificationDisplay } from '../../../utils/productClassificationDisplay';

describe('getProductClassificationDisplay', () => {
  it('shows the classified product type and source', () => {
    expect(
      getProductClassificationDisplay({
        productType: { id: 11, code: 'milk', name: '牛乳', standardCategoryId: 4 },
        productTypeStatus: 'classified',
        classificationSource: 'standard_dictionary',
        classificationConfidence: 'high',
      })
    ).toEqual({ label: '牛乳', detail: '標準ルール' });
  });

  it('distinguishes an item outside the initial scope', () => {
    expect(
      getProductClassificationDisplay({
        productType: null,
        productTypeStatus: 'outside_initial_scope',
        classificationSource: null,
        classificationConfidence: null,
      })
    ).toEqual({ label: '初期分類の対象外' });
  });

  it('shows a manually corrected product type separately from category status', () => {
    expect(
      getProductClassificationDisplay({
        productType: { id: 11, code: 'milk', name: '牛乳', standardCategoryId: 4 },
        productTypeStatus: 'classified',
        classificationSource: 'manual',
        classificationConfidence: 'high',
      })
    ).toEqual({ label: '牛乳', detail: '手動修正' });
  });
});
