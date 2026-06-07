import { vi } from 'vitest';
import { mockReceiptJobs, registerMockReceiptJob } from './mockJobStore';

export { registerMockReceiptJob, clearMockReceiptJobs } from './mockJobStore';

let jobCounter = 0;

/**
 * receiptRoutes が import する BullMQ Queue をテスト時に Redis へ接続させない。
 * integration テストファイルの先頭で import すること。
 */
vi.mock('../queues/receiptQueue', () => ({
  RECEIPT_QUEUE_NAME: 'receipt-analysis',
  receiptQueue: {
    add: vi.fn().mockImplementation(async (_name: string, data: { memberId?: number; familyGroupId?: number; imagePath?: string }) => {
      const id = `mock-job-${++jobCounter}`;
      registerMockReceiptJob(id, {
        memberId: data.memberId!,
        familyGroupId: data.familyGroupId!,
        imagePath: data.imagePath,
      });
      return { id };
    }),
    getJob: vi.fn().mockImplementation(async (id: string) => mockReceiptJobs.get(id) ?? null),
  },
}));
