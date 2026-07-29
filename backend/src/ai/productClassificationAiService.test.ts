import { describe, expect, it, vi } from 'vitest';
import type { ProductClassificationProvider } from './productClassificationProvider';
import { classifyProductsWithAi } from './productClassificationAiService';
import type { ProductClassificationAiRequest } from './productClassificationContract';

const request: ProductClassificationAiRequest = {
  familyGroupId: 1,
  items: [
    {
      itemId: 10,
      itemName: '特濃牛乳',
      normalizedName: '特濃牛乳',
      candidates: [{ productTypeId: 11, name: '牛乳', standardCategoryName: '乳製品' }],
    },
  ],
};

describe('classifyProductsWithAi', () => {
  it('returns a validated response from an injected provider', async () => {
    const provider: ProductClassificationProvider = {
      classifyProducts: vi.fn().mockResolvedValue({ text: '{"items":[{"itemId":10,"productTypeId":11,"confidence":"high"}]}', modelId: 'mock', usage: { promptTokens: 1, candidatesTokens: 1, totalTokens: 2 } }),
    };

    await expect(classifyProductsWithAi(request, provider)).resolves.toEqual({
      response: { items: [{ itemId: 10, productTypeId: 11, confidence: 'high' }] }, modelId: 'mock', usage: { promptTokens: 1, candidatesTokens: 1, totalTokens: 2 },
    });
  });

  it('rejects an invalid provider response without returning a partial result', async () => {
    const provider: ProductClassificationProvider = {
      classifyProducts: vi.fn().mockResolvedValue({ text: '{"items":[{"itemId":10,"productTypeId":999,"confidence":"high"}]}', modelId: 'mock', usage: { promptTokens: 1, candidatesTokens: 1, totalTokens: 2 } }),
    };

    await expect(classifyProductsWithAi(request, provider)).rejects.toThrow('候補外の商品種別ID');
  });
});
