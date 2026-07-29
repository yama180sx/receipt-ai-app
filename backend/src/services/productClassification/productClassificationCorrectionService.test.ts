import {
  ClassificationConfidence,
  ClassificationCorrectionScope,
  ClassificationSource,
  ProductTypeStatus,
} from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const repositoryMocks = vi.hoisted(() => ({
  createClassificationCorrectionInTx: vi.fn(),
  deleteProductClassificationCandidatesInTx: vi.fn(),
  findActiveProductTypeWithCategoryInTx: vi.fn(),
  findCategoryForProductTypeInTx: vi.fn(),
  upsertHouseholdProductDictionaryInTx: vi.fn(),
  upsertProductClassificationAliasInTx: vi.fn(),
  findItemWithReceiptInTx: vi.fn(),
  updateItemCategoryInTx: vi.fn(),
}));

vi.mock('../../utils/prismaTransaction', () => ({
  runInTransaction: (callback: (tx: object) => unknown) => callback({}),
}));
vi.mock('../../repositories/productClassificationRepository', () => repositoryMocks);
vi.mock('../../repositories/receiptRepository', () => repositoryMocks);

import { correctItemProductClassification } from './productClassificationCorrectionService';

describe('correctItemProductClassification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    repositoryMocks.findItemWithReceiptInTx.mockResolvedValue({
      id: 10,
      name: '明治 おいしい牛乳',
      productTypeId: 3,
      receipt: { familyGroupId: 1 },
    });
    repositoryMocks.findActiveProductTypeWithCategoryInTx.mockResolvedValue({
      id: 11,
      standardCategoryId: 4,
      standardCategory: { name: '乳製品', parent: { name: '食費' } },
    });
    repositoryMocks.findCategoryForProductTypeInTx.mockResolvedValue({ id: 2 });
    repositoryMocks.updateItemCategoryInTx.mockResolvedValue({ id: 10 });
  });

  it('stores only an audit record for ITEM_ONLY', async () => {
    await correctItemProductClassification(10, 1, 7, {
      productTypeId: 11,
      scope: ClassificationCorrectionScope.ITEM_ONLY,
    });

    expect(repositoryMocks.updateItemCategoryInTx).toHaveBeenCalledWith(
      expect.anything(),
      10,
      expect.objectContaining({
        categoryId: 2,
        productTypeId: 11,
        productTypeStatus: ProductTypeStatus.CLASSIFIED,
        classificationSource: ClassificationSource.MANUAL,
        classificationConfidence: ClassificationConfidence.HIGH,
      })
    );
    expect(repositoryMocks.createClassificationCorrectionInTx).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        familyGroupId: 1,
        itemId: 10,
        actorMemberId: 7,
        previousProductTypeId: 3,
        nextProductTypeId: 11,
        scope: ClassificationCorrectionScope.ITEM_ONLY,
      })
    );
    expect(repositoryMocks.upsertHouseholdProductDictionaryInTx).not.toHaveBeenCalled();
    expect(repositoryMocks.upsertProductClassificationAliasInTx).not.toHaveBeenCalled();
    expect(repositoryMocks.deleteProductClassificationCandidatesInTx).toHaveBeenCalledWith(
      expect.anything(),
      10
    );
  });

  it('stores an OCR-name dictionary entry for SAME_OCR_NAME', async () => {
    await correctItemProductClassification(10, 1, 7, {
      productTypeId: 11,
      scope: ClassificationCorrectionScope.SAME_OCR_NAME,
    });

    expect(repositoryMocks.upsertHouseholdProductDictionaryInTx).toHaveBeenCalledWith(
      expect.anything(),
      { familyGroupId: 1, normalizedName: '明治 おいしい牛乳', productTypeId: 11 }
    );
    expect(repositoryMocks.upsertProductClassificationAliasInTx).not.toHaveBeenCalled();
  });

  it('stores a supplied classification name as an alias for SAME_CLASSIFICATION_NAME', async () => {
    await correctItemProductClassification(10, 1, 7, {
      productTypeId: 11,
      scope: ClassificationCorrectionScope.SAME_CLASSIFICATION_NAME,
      classificationName: '牛乳',
    });

    expect(repositoryMocks.upsertProductClassificationAliasInTx).toHaveBeenCalledWith(
      expect.anything(),
      { familyGroupId: 1, normalizedName: '牛乳', productTypeId: 11 }
    );
    expect(repositoryMocks.upsertHouseholdProductDictionaryInTx).not.toHaveBeenCalled();
  });

  it('rejects a correction for an item owned by another household', async () => {
    repositoryMocks.findItemWithReceiptInTx.mockResolvedValue({
      id: 20,
      name: '別世帯の商品',
      productTypeId: null,
      receipt: { familyGroupId: 2 },
    });

    await expect(
      correctItemProductClassification(20, 1, 7, {
        productTypeId: 11,
        scope: ClassificationCorrectionScope.ITEM_ONLY,
      })
    ).rejects.toThrow('ItemNotFound');

    expect(repositoryMocks.updateItemCategoryInTx).not.toHaveBeenCalled();
    expect(repositoryMocks.createClassificationCorrectionInTx).not.toHaveBeenCalled();
  });
});
