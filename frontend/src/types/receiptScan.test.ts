import { describe, expect, it } from 'vitest';
import { buildScanInitialDataFromJobStatus } from '../types/receiptScan';

describe('buildScanInitialDataFromJobStatus', () => {
  it('returns null for non-completed jobs', () => {
    expect(
      buildScanInitialDataFromJobStatus('job-1', { state: 'active' })
    ).toBeNull();
  });

  it('maps completed job result to scan initial data', () => {
    const data = buildScanInitialDataFromJobStatus('job-1', {
      state: 'completed',
      duplicateSuspected: true,
      existingReceiptId: 99,
      result: {
        parsedData: {
          storeName: 'テスト店',
          purchaseDate: '2026-01-01',
          totalAmount: 500,
          items: [{ name: '商品', price: 500, quantity: 1, categoryId: 1 }],
        },
        imagePath: 'uploads/test.webp',
        validation: { isSuspicious: false, warnings: [] },
      },
    });

    expect(data).toMatchObject({
      jobId: 'job-1',
      imagePath: 'uploads/test.webp',
      duplicateSuspected: true,
      existingReceiptId: 99,
      warnedDuplicateFromTray: true,
    });
  });
});
