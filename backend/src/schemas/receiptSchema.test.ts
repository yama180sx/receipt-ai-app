import { describe, expect, it } from 'vitest';
import { productClassificationCorrectionSchema } from './receiptSchema';

describe('productClassificationCorrectionSchema', () => {
  it('requires classificationName only for SAME_CLASSIFICATION_NAME', () => {
    expect(
      productClassificationCorrectionSchema.safeParse({
        productTypeId: 1,
        scope: 'same_classification_name',
      }).success
    ).toBe(false);

    expect(
      productClassificationCorrectionSchema.safeParse({
        productTypeId: 1,
        scope: 'same_classification_name',
        classificationName: '牛乳',
      }).success
    ).toBe(true);
  });
});
