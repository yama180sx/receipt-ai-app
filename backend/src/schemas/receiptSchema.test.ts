import { describe, expect, it } from 'vitest';
import { ClassificationCorrectionScope, ProductTypeStatus } from '@prisma/client';
import {
  deactivateProductClassificationLearningDataSchema,
  productClassificationCorrectionSchema,
  productClassificationReclassificationSchema,
} from './receiptSchema';

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

describe('productClassificationReclassificationSchema', () => {
  it('converts API statuses to the Prisma enum values', () => {
    const result = productClassificationReclassificationSchema.parse({
      statuses: ['unclassified', 'needs_review'],
      limit: 10,
    });

    expect(result.statuses).toEqual([
      ProductTypeStatus.UNCLASSIFIED,
      ProductTypeStatus.NEEDS_REVIEW,
    ]);
  });
});
