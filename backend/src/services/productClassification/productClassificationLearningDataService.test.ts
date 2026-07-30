import { describe, expect, it, vi } from 'vitest';

const repositoryMocks = vi.hoisted(() => ({
  findProductClassificationLearningData: vi.fn(),
  deactivateProductClassificationLearningDataInTx: vi.fn(),
}));
const transactionMocks = vi.hoisted(() => ({ runInTransaction: vi.fn() }));

vi.mock('../../repositories/productClassificationRepository', () => repositoryMocks);
vi.mock('../../utils/prismaTransaction', () => transactionMocks);

import {
  deactivateLearningData,
  listProductClassificationLearningData,
} from './productClassificationLearningDataService';

const productType = { id: 4, code: 'milk', name: '牛乳', standardCategoryId: 2 };

describe('productClassificationLearningDataService', () => {
  it('returns the latest audit event only for the corresponding household learning data', async () => {
    const createdAt = new Date('2026-07-30T00:00:00.000Z');
    repositoryMocks.findProductClassificationLearningData.mockResolvedValue({
      dictionaries: [{ id: 11, normalizedName: 'ぎゅうにゅう', productTypeId: 4, productType, isActive: false, createdAt, updatedAt: createdAt }],
      aliases: [], histories: [],
      events: [{
        learningDataType: 'HOUSEHOLD_DICTIONARY', learningDataId: 11, reason: '誤分類', createdAt,
        actorMember: { name: '山本' }, familyGroup: { name: '山本家' },
      }],
    });

    await expect(listProductClassificationLearningData(1)).resolves.toEqual([expect.objectContaining({
      id: 11,
      lastDeactivationAudit: { reason: '誤分類', actorMemberName: '山本', familyGroupName: '山本家', createdAt },
    })]);
  });

  it('deactivates and records the reason in one transaction', async () => {
    const record = { id: 11, normalizedName: 'ぎゅうにゅう', productTypeId: 4, productType, isActive: false, createdAt: new Date(), updatedAt: new Date() };
    const audit = { reason: '誤分類', createdAt: new Date(), actorMember: { name: '山本' }, familyGroup: { name: '山本家' } };
    transactionMocks.runInTransaction.mockImplementation((callback) => callback('tx'));
    repositoryMocks.deactivateProductClassificationLearningDataInTx.mockResolvedValue({ record, audit });

    await expect(deactivateLearningData(1, 2, 'household_dictionary', 11, '誤分類')).resolves.toMatchObject({ id: 11, type: 'household_dictionary' });
    expect(repositoryMocks.deactivateProductClassificationLearningDataInTx).toHaveBeenCalledWith('tx', {
      familyGroupId: 1, actorMemberId: 2, type: 'household_dictionary', id: 11, reason: '誤分類',
    });
  });
});
