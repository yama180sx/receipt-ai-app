import { describe, expect, it } from 'vitest';
import { ClassificationCorrectionScope } from '@prisma/client';
import { deactivateProductClassificationLearningDataSchema, productClassificationCorrectionSchema } from './receiptSchema';

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

  it('converts the API scope to the Prisma enum value', () => {
    const result = productClassificationCorrectionSchema.parse({
      productTypeId: 1,
      scope: 'same_ocr_name',
    });

    expect(result.scope).toBe(ClassificationCorrectionScope.SAME_OCR_NAME);
  });
});

describe('deactivateProductClassificationLearningDataSchema', () => {
  it('requires a non-empty reason', () => {
    expect(deactivateProductClassificationLearningDataSchema.safeParse({ reason: '  ' }).success).toBe(false);
    expect(deactivateProductClassificationLearningDataSchema.parse({ reason: '誤分類のため' })).toEqual({ reason: '誤分類のため' });
  });
});
