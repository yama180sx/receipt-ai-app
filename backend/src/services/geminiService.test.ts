import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  generateContent: vi.fn(),
  findActivePromptTemplateByKey: vi.fn(),
  createApiUsageLog: vi.fn(),
  incrementApiUsageLogTokens: vi.fn(),
  findEffectiveAiPricingRevision: vi.fn(),
}));

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: class {
    getGenerativeModel() {
      return { generateContent: mocks.generateContent };
    }
  },
}));

vi.mock('fs', () => ({
  existsSync: vi.fn(() => true),
  readFileSync: vi.fn(() => Buffer.from('image')),
}));

vi.mock('../repositories/promptRepository', () => ({
  findActivePromptTemplateByKey: mocks.findActivePromptTemplateByKey,
}));

vi.mock('../repositories/apiUsageLogRepository', () => ({
  createApiUsageLog: mocks.createApiUsageLog,
  incrementApiUsageLogTokens: mocks.incrementApiUsageLogTokens,
}));

vi.mock('../repositories/aiPricingRevisionRepository', () => ({
  findEffectiveAiPricingRevision: mocks.findEffectiveAiPricingRevision,
}));

vi.mock('../utils/logger', () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

import { analyzeReceiptImage } from './geminiService';

function resultFor(data: unknown) {
  return {
    response: Promise.resolve({
      text: () => JSON.stringify(data),
      usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 2, totalTokenCount: 12 },
    }),
  };
}

const invalidReceipt = {
  storeName: 'Store',
  purchaseDate: '2026-08-16 12:00',
  totalAmount: 100,
  taxAmount: 0,
  items: [{ name: 'Item', price: 50, quantity: 1 }],
};

describe('analyzeReceiptImage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findActivePromptTemplateByKey.mockResolvedValue({ systemPrompt: 'prompt', domainHints: null });
    mocks.createApiUsageLog.mockResolvedValue({ id: 123 });
    mocks.findEffectiveAiPricingRevision.mockResolvedValue({ id: 77 });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects a result that remains arithmetically inconsistent after self-repair', async () => {
    vi.spyOn(Date, 'now')
      .mockReturnValueOnce(1_000)
      .mockReturnValueOnce(1_025)
      .mockReturnValueOnce(2_000)
      .mockReturnValueOnce(2_040);
    mocks.generateContent
      .mockResolvedValueOnce(resultFor(invalidReceipt))
      .mockResolvedValueOnce(resultFor(invalidReceipt));

    await expect(analyzeReceiptImage('uploads/test.webp', 1))
      .rejects.toThrow('Gemini解析結果の算術整合性を確認できませんでした');

    expect(mocks.incrementApiUsageLogTokens).toHaveBeenCalledWith(123, {
      promptTokens: 10,
      candidatesTokens: 2,
      totalTokens: 12,
      selfRepairRetryCount: 1,
      durationMs: 40,
    });

    expect(mocks.createApiUsageLog).toHaveBeenCalledWith(expect.objectContaining({ durationMs: 25, pricingRevisionId: 77 }));
  });
});
