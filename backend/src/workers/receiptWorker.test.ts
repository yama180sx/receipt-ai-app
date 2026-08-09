import { beforeEach, describe, expect, it, vi } from 'vitest';

type JobInput = {
  id: string;
  data: { memberId: number; familyGroupId: number; imagePath: string };
  updateData: ReturnType<typeof vi.fn>;
};

const mocks = vi.hoisted(() => ({
  processor: undefined as undefined | ((job: JobInput) => Promise<unknown>),
  analyzeOnly: vi.fn(),
  runWithTenant: vi.fn(),
  getErrorMessage: vi.fn(),
  isRetryableHttpError: vi.fn(),
  getReceiptAnalysisFailureCode: vi.fn(),
  loggerError: vi.fn(),
  UnrecoverableError: class TestUnrecoverableError extends Error {},
}));

vi.mock('bullmq', () => ({
  Worker: class {
    constructor(_queueName: string, processor: (job: JobInput) => Promise<unknown>) {
      mocks.processor = processor;
    }
  },
  UnrecoverableError: mocks.UnrecoverableError,
}));
vi.mock('../config/redis', () => ({ redisConnection: {} }));
vi.mock('../queues/receiptQueue', () => ({ RECEIPT_QUEUE_NAME: 'receipt-analysis' }));
vi.mock('../services/receipt/receiptAnalysisService', () => ({ analyzeOnly: mocks.analyzeOnly }));
vi.mock('../utils/context', () => ({ runWithTenant: mocks.runWithTenant }));
vi.mock('../utils/logger', () => ({ default: { info: vi.fn(), error: mocks.loggerError } }));
vi.mock('../utils/httpError', () => ({
  getErrorMessage: mocks.getErrorMessage,
  isRetryableHttpError: mocks.isRetryableHttpError,
}));
vi.mock('../config/receiptRetryPolicy', () => ({
  getReceiptAnalysisFailureCode: mocks.getReceiptAnalysisFailureCode,
}));

import './receiptWorker';

describe('receiptWorker', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.runWithTenant.mockImplementation(
      (_context: unknown, fn: () => Promise<unknown>) => fn()
    );
  });

  it('returns analysis results within the job tenant context without external services', async () => {
    const result = { parsedData: { taxAmount: 10 }, imagePath: 'uploads/test.webp', validation: {} };
    mocks.analyzeOnly.mockResolvedValue(result);
    const job: JobInput = {
      id: 'job-1',
      data: { memberId: 3, familyGroupId: 7, imagePath: 'uploads/test.webp' },
      updateData: vi.fn(),
    };

    await expect(mocks.processor!(job)).resolves.toEqual(result);
    expect(mocks.runWithTenant).toHaveBeenCalledWith(
      { memberId: 3, familyGroupId: 7 },
      expect.any(Function)
    );
    expect(mocks.analyzeOnly).toHaveBeenCalledWith(
      { memberId: 3, familyGroupId: 7 },
      'uploads/test.webp'
    );
  });

  it('records a failure code and stops retries for unrecoverable errors', async () => {
    const error = new Error('provider failed');
    mocks.analyzeOnly.mockRejectedValue(error);
    mocks.getErrorMessage.mockReturnValue('provider failed');
    mocks.getReceiptAnalysisFailureCode.mockReturnValue('INVALID_RESPONSE');
    mocks.isRetryableHttpError.mockReturnValue(false);
    const job: JobInput = {
      id: 'job-2',
      data: { memberId: 3, familyGroupId: 7, imagePath: 'uploads/test.webp' },
      updateData: vi.fn(),
    };

    await expect(mocks.processor!(job)).rejects.toBeInstanceOf(mocks.UnrecoverableError);
    expect(job.updateData).toHaveBeenCalledWith({
      ...job.data,
      failureCode: 'INVALID_RESPONSE',
    });
  });
});
