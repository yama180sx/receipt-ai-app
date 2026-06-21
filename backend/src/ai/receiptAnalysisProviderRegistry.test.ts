import { describe, expect, it, vi } from 'vitest';
import type { ParsedReceipt } from '../types/receipt';
import type { ReceiptAnalysisProvider } from './receiptAnalysisProvider';
import {
  getReceiptAnalysisProvider,
  resetReceiptAnalysisProvider,
  setReceiptAnalysisProvider,
} from './receiptAnalysisProviderRegistry';
import { geminiReceiptAnalysisProvider } from './geminiReceiptAnalysisProvider';

describe('receiptAnalysisProviderRegistry', () => {
  it('returns gemini provider by default', () => {
    resetReceiptAnalysisProvider();
    expect(getReceiptAnalysisProvider()).toBe(geminiReceiptAnalysisProvider);
  });

  it('allows injecting a mock provider for tests', async () => {
    const mockParsed: ParsedReceipt = {
      storeName: 'Mock Store',
      date: '2026-06-01',
      totalAmount: 100,
      items: [{ name: 'Item', price: 100, quantity: 1 }],
    };

    const mockProvider: ReceiptAnalysisProvider = {
      analyzeReceiptImage: vi.fn().mockResolvedValue(mockParsed),
    };

    setReceiptAnalysisProvider(mockProvider);

    await expect(
      getReceiptAnalysisProvider().analyzeReceiptImage('/tmp/mock.jpg', 1)
    ).resolves.toEqual(mockParsed);

    resetReceiptAnalysisProvider();
    expect(getReceiptAnalysisProvider()).toBe(geminiReceiptAnalysisProvider);
  });
});
