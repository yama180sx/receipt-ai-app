import { describe, expect, it } from 'vitest';
import { ClassificationCorrectionScope, ProductTypeStatus } from '@prisma/client';
import {
  deactivateProductClassificationLearningDataSchema,
  manualReceiptSchema,
  productClassificationCorrectionSchema,
  productClassificationReclassificationSchema,
} from './receiptSchema';

describe('productClassificationCorrectionSchema', () => {
  it('accepts only the supported correction scopes', () => {
    expect(
      productClassificationCorrectionSchema.safeParse({
        productTypeId: 1,
        scope: 'same_classification_name',
      }).success
    ).toBe(false);

    expect(productClassificationCorrectionSchema.safeParse({ productTypeId: 1, scope: 'same_ocr_name' }).success).toBe(true);
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

describe('manualReceiptSchema', () => {
  it('accepts an optional positive target member ID', () => {
    const result = manualReceiptSchema.parse({
      memberId: '2', date: '2026-09-16', storeName: '店舗',
      items: [{ name: '商品', price: '100', quantity: '1' }],
    });
    expect(result.memberId).toBe(2);
  });

  it('rejects invalid target member IDs and an empty item list', () => {
    expect(() => manualReceiptSchema.parse({ memberId: 0, date: '2026-09-16', storeName: '店舗', items: [] })).toThrow();
  });
});
