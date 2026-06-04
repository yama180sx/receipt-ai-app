import { vi } from 'vitest';

/**
 * receiptRoutes が import する BullMQ Queue をテスト時に Redis へ接続させない。
 * integration テストファイルの先頭で import すること。
 */
vi.mock('../queues/receiptQueue', () => ({
  RECEIPT_QUEUE_NAME: 'receipt-analysis',
  receiptQueue: {
    add: vi.fn().mockResolvedValue({ id: 'test-job' }),
  },
}));
