import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  candidates: vi.fn(), lock: vi.fn(), persist: vi.fn(), findById: vi.fn(),
}));
vi.mock('../../utils/logger', () => ({ default: { info: vi.fn() } }));
vi.mock('../../utils/normalizer', () => ({ normalizeStoreName: async (value: string) => value, normalizeStoreNames: vi.fn() }));
vi.mock('../../utils/prismaTransaction', () => ({ runReceiptCommitTransaction: async (fn: (tx: object) => Promise<unknown>) => fn({}) }));
vi.mock('../duplicateReceiptService', () => ({
  parseReceiptDate: () => new Date('2026-11-23T08:27:00Z'),
  findDuplicateCandidates: mocks.candidates,
  unreviewedDuplicateId: (candidates: Array<{id: number}>, reviewed: number[]) => candidates.find((c) => !reviewed.includes(c.id))?.id ?? null,
}));
vi.mock('../../repositories/receiptRepository', () => ({
  findReceiptById: mocks.findById, findReceiptByImageHash: vi.fn(), findReceiptByImagePath: vi.fn(),
  findDuplicateReceiptCandidatesInTx: vi.fn(), lockReceiptFamilyInTx: mocks.lock,
}));
vi.mock('./receiptCommitPersistence', () => ({ persistReceiptCommitInTx: mocks.persist }));
vi.mock('../productClassification/productClassificationAiIntegrationService', () => ({ applyProductClassificationAiToItems: vi.fn() }));

import { saveParsedReceipt } from './receiptPersistenceService';

const input = { storeName: '店', purchaseDate: '2026-11-23 17:27', totalAmount: 100, items: [] };

describe('receipt duplicate confirmation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.lock.mockResolvedValue(undefined);
    mocks.persist.mockResolvedValue(7);
    mocks.findById.mockResolvedValue({ id: 7, items: [] });
  });
  it('rejects a candidate added after the user reviewed earlier candidates', async () => {
    mocks.candidates.mockResolvedValue([{ id: 1 }, { id: 2 }]);
    await expect(saveParsedReceipt(1, 3, input, '', false, [], undefined, [1])).rejects.toMatchObject({ message: 'DUPLICATE', existingId: 2 });
    expect(mocks.lock).toHaveBeenCalledWith(expect.anything(), 3);
    expect(mocks.persist).not.toHaveBeenCalled();
  });
  it('saves after every current candidate is reviewed', async () => {
    mocks.candidates.mockResolvedValue([{ id: 1 }]);
    await expect(saveParsedReceipt(1, 3, input, '', false, [], undefined, [1])).resolves.toMatchObject({ id: 7 });
    expect(mocks.persist).toHaveBeenCalledOnce();
  });
});
