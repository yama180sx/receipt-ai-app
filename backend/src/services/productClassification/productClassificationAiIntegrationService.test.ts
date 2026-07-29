import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ClassificationConfidence,
  ClassificationSource,
  ProductTypeStatus,
} from '@prisma/client';

const { aiMocks, receiptRepositoryMocks, productRepositoryMocks } = vi.hoisted(() => ({
  aiMocks: { classifyProductsWithAi: vi.fn() },
  receiptRepositoryMocks: {
    findItemById: vi.fn(),
    findProductClassificationAiTargetInTx: vi.fn(),
    findProductClassificationAiTargets: vi.fn(),
    updateItemProductClassificationInTx: vi.fn(),
  },
  productRepositoryMocks: {
    findActiveProductTypeWithCategoryInTx: vi.fn(),
    findCategoryForProductTypeInTx: vi.fn(),
  },
}));

vi.mock('../../ai', () => aiMocks);
vi.mock('../../repositories/receiptRepository', () => receiptRepositoryMocks);
vi.mock('../../repositories/productClassificationRepository', () => productRepositoryMocks);
vi.mock('../../utils/prismaTransaction', () => ({
  runInTransaction: (fn: (tx: object) => Promise<unknown>) => fn({}),
}));

import { applyProductClassificationAiToItems } from './productClassificationAiIntegrationService';

const target = {
  id: 10,
  name: '特濃牛乳 1000ml',
  normalizedName: '特濃牛乳 1000ml',
  categoryId: 5,
  receipt: { familyGroupId: 1, storeName: 'テスト店' },
  productClassificationCandidates: [
    {
      productTypeId: 11,
      productType: { name: '牛乳', standardCategory: { name: '乳製品' } },
    },
  ],
};

describe('applyProductClassificationAiToItems', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    receiptRepositoryMocks.findProductClassificationAiTargets.mockResolvedValue([target]);
    receiptRepositoryMocks.findProductClassificationAiTargetInTx.mockResolvedValue(target);
    receiptRepositoryMocks.updateItemProductClassificationInTx.mockResolvedValue({});
    productRepositoryMocks.findActiveProductTypeWithCategoryInTx.mockResolvedValue({
      id: 11,
      standardCategoryId: 21,
      standardCategory: { name: '乳製品', parent: { name: '食費' } },
    });
    productRepositoryMocks.findCategoryForProductTypeInTx.mockResolvedValue({ id: 5 });
  });

  it('high の候補内選択だけを分類済みとして保存する', async () => {
    aiMocks.classifyProductsWithAi.mockResolvedValue({
      items: [{ itemId: 10, productTypeId: 11, confidence: 'high' }],
    });

    await applyProductClassificationAiToItems(1, [10]);

    expect(receiptRepositoryMocks.updateItemProductClassificationInTx).toHaveBeenCalledWith(
      expect.anything(),
      10,
      expect.objectContaining({
        categoryId: 5,
        standardCategoryId: 21,
        productTypeId: 11,
        productTypeStatus: ProductTypeStatus.CLASSIFIED,
        classificationSource: ClassificationSource.AI,
        classificationConfidence: ClassificationConfidence.HIGH,
      })
    );
  });

  it.each([
    { productTypeId: 11, confidence: 'medium' as const, expectedConfidence: ClassificationConfidence.MEDIUM },
    { productTypeId: null, confidence: 'low' as const, expectedConfidence: ClassificationConfidence.LOW },
  ])('medium・low・null は候補を残した要確認状態として保存する', async ({
    productTypeId,
    confidence,
    expectedConfidence,
  }) => {
    aiMocks.classifyProductsWithAi.mockResolvedValue({
      items: [{ itemId: 10, productTypeId, confidence }],
    });

    await applyProductClassificationAiToItems(1, [10]);

    expect(receiptRepositoryMocks.updateItemProductClassificationInTx).toHaveBeenCalledWith(
      expect.anything(),
      10,
      expect.objectContaining({
        categoryId: 5,
        standardCategoryId: null,
        productTypeId: null,
        productTypeStatus: ProductTypeStatus.NEEDS_REVIEW,
        classificationSource: ClassificationSource.AI,
        classificationConfidence: expectedConfidence,
      })
    );
  });

  it('AI障害時は例外を伝播せず既存の要確認状態を維持する', async () => {
    aiMocks.classifyProductsWithAi.mockRejectedValue(new Error('Gemini unavailable'));

    await expect(applyProductClassificationAiToItems(1, [10])).resolves.toBeUndefined();
    expect(receiptRepositoryMocks.updateItemProductClassificationInTx).not.toHaveBeenCalled();
  });

  it('AI分類対象の取得失敗もレシート保存へ伝播させない', async () => {
    receiptRepositoryMocks.findProductClassificationAiTargets.mockRejectedValue(
      new Error('database temporarily unavailable')
    );

    await expect(applyProductClassificationAiToItems(1, [10])).resolves.toBeUndefined();
    expect(aiMocks.classifyProductsWithAi).not.toHaveBeenCalled();
    expect(receiptRepositoryMocks.updateItemProductClassificationInTx).not.toHaveBeenCalled();
  });
});
