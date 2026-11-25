import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  generateContent: vi.fn(),
  findActivePromptTemplateByKeyForFamilyGroup: vi.fn(),
  createApiUsageLog: vi.fn(),
  incrementApiUsageLogTokens: vi.fn(),
  findEffectiveAiPricingRevision: vi.fn(),
  reserveAiBudget: vi.fn(),
  releaseAiBudgetReservation: vi.fn(),
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
  findActivePromptTemplateByKeyForFamilyGroup: mocks.findActivePromptTemplateByKeyForFamilyGroup,
}));

vi.mock('../repositories/apiUsageLogRepository', () => ({
  createApiUsageLog: mocks.createApiUsageLog,
  incrementApiUsageLogTokens: mocks.incrementApiUsageLogTokens,
}));

vi.mock('../repositories/aiPricingRevisionRepository', () => ({
  findEffectiveAiPricingRevision: mocks.findEffectiveAiPricingRevision,
}));
vi.mock('./aiBudget/aiBudgetGuardService', () => ({ reserveAiBudget: mocks.reserveAiBudget, releaseAiBudgetReservation: mocks.releaseAiBudgetReservation }));

vi.mock('../utils/logger', () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

import { analyzeReceiptImage, ReceiptArithmeticError } from './geminiService';
import { runReceiptDiagnostics } from './receipt/receiptDiagnosticRunner';

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
    mocks.findActivePromptTemplateByKeyForFamilyGroup.mockResolvedValue({
      id: 10,
      version: 3,
      systemPrompt: 'prompt',
      domainHints: null,
    });
    mocks.createApiUsageLog.mockResolvedValue({ id: 123 });
    mocks.findEffectiveAiPricingRevision.mockResolvedValue({ id: 77, maxInputTokens: 4096, maxOutputTokens: 1024, inputPriceJpyPerMillion: '48', outputPriceJpyPerMillion: '394' });
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

    await expect(analyzeReceiptImage('uploads/test.webp', 1, 2))
      .rejects.toThrow('Gemini解析結果の算術整合性を確認できませんでした');

    expect(mocks.incrementApiUsageLogTokens).toHaveBeenCalledWith(123, {
      promptTokens: 10,
      candidatesTokens: 2,
      totalTokens: 12,
      selfRepairRetryCount: 1,
      durationMs: 40,
    });

    expect(mocks.findActivePromptTemplateByKeyForFamilyGroup).toHaveBeenCalledWith(2, 'RECEIPT_ANALYSIS');
    expect(mocks.createApiUsageLog).toHaveBeenCalledWith(expect.objectContaining({
      durationMs: 25,
      pricingRevisionId: 77,
      promptTemplateId: 10,
      promptTemplateVersion: 3,
      promptFingerprint: expect.stringMatching(/^[a-f0-9]{64}$/),
    }));
  });

  it('leaves an unreadable total for user review without inventing a value', async () => {
    mocks.generateContent.mockResolvedValueOnce(resultFor({ ...invalidReceipt, totalAmount: null, purchaseDate: null }));
    const result = await analyzeReceiptImage('uploads/test.webp', 1, 2);
    expect(result.totalAmount).toBeNull();
    expect(result.purchaseDate).toBeNull();
    expect(mocks.generateContent).toHaveBeenCalledTimes(1);
    const reservation = mocks.reserveAiBudget.mock.calls[0][0];
    expect(reservation.jobKey).toMatch(/^ocr:[0-9a-f-]{36}$/);
    expect(reservation.jobKey).not.toContain('uploads/test.webp');
    expect(mocks.releaseAiBudgetReservation).toHaveBeenCalledWith(reservation.jobKey);
  });

  it('reports both attempts only to the explicit diagnostic observer on arithmetic failure', async () => {
    mocks.generateContent.mockResolvedValueOnce(resultFor(invalidReceipt)).mockResolvedValueOnce(resultFor(invalidReceipt));
    const observer = vi.fn();
    await expect(analyzeReceiptImage('uploads/test.webp', 1, 2, observer)).rejects.toThrow('Gemini解析結果の算術整合性を確認できませんでした');
    expect(observer).toHaveBeenCalledTimes(2);
    expect(observer.mock.calls[0][0]).toMatchObject({ phase: 'initial', arithmeticDiff: 50, promptTemplateId: 10, promptTemplateVersion: 3 });
    expect(observer.mock.calls[1][0]).toMatchObject({ phase: 'repair', arithmeticDiff: 50 });
  });

  it('aggregates repeated real-service arithmetic failures without disclosing extracted values', async () => {
    mocks.generateContent.mockResolvedValue(resultFor(invalidReceipt));
    const report = await runReceiptDiagnostics({
      runs: 2,
      showValues: false,
      analyze: (observer) => analyzeReceiptImage('uploads/test.webp', 1, 2, observer),
      classify: (error) => error instanceof ReceiptArithmeticError ? 'arithmetic_mismatch' : 'analysis_error',
    });
    expect(mocks.generateContent).toHaveBeenCalledTimes(4);
    expect(report.trials.map((trial) => trial.status)).toEqual(['arithmetic_mismatch', 'arithmetic_mismatch']);
    expect(report.trials[0].attempts).toHaveLength(2);
    expect(report.observedFinalFieldsStable).toEqual({ storeName: true, purchaseDate: true, totalAmount: true });
    expect(JSON.stringify(report)).not.toContain('"Store"');
    expect(JSON.stringify(report)).not.toContain('"Item"');
  });

  it('applies an isolated diagnostic prompt while retaining safety instructions and identifying provenance', async () => {
    mocks.generateContent.mockResolvedValue(resultFor({ ...invalidReceipt, totalAmount: 50 }));
    const baseline = vi.fn();
    const changed = vi.fn();
    await analyzeReceiptImage('uploads/test.webp', 1, 2, baseline);
    await analyzeReceiptImage('uploads/test.webp', 1, 2, changed, 'diagnostic prompt');
    const sent = mocks.generateContent.mock.calls[1][0][0] as string;
    expect(sent).toContain('diagnostic prompt');
    expect(sent).toContain('読み取れない場合は推測や現在日時を使わず');
    expect(changed.mock.calls[0][0]).toMatchObject({ promptSource: 'diagnostic_override', promptTemplateId: 10 });
    expect(changed.mock.calls[0][0].promptFingerprint).not.toEqual(baseline.mock.calls[0][0].promptFingerprint);
  });
});
