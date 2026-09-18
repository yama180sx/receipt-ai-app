import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(), auditCreate: vi.fn(), updateMany: vi.fn(), transaction: vi.fn(), decrypt: vi.fn(), encrypt: vi.fn(),
}));

vi.mock('../utils/prismaClient', () => ({
  globalPrisma: {
    familyMember: { findMany: mocks.findMany },
    totpSecretReencryptionAudit: { create: mocks.auditCreate },
    $transaction: mocks.transaction,
  },
}));
vi.mock('../utils/totpLegacyMigrationCrypto', () => ({ decryptLegacyTotpSecretForMigration: mocks.decrypt }));
vi.mock('../utils/totpCrypto', () => ({ CURRENT_TOTP_KEY_VERSION: 'totp-v1', encryptTotpSecret: mocks.encrypt }));

import { reencryptLegacyTotpSecrets } from './totpReencryptionService';

const input = { operatorName: 'root-maintainer', reason: 'planned migration' };

describe('TOTP再暗号化サービス', () => {
  beforeEach(() => {
    Object.values(mocks).forEach((mock) => mock.mockReset());
    mocks.transaction.mockImplementation((callback) => callback({
      familyMember: { updateMany: mocks.updateMany },
      totpSecretReencryptionAudit: { create: mocks.auditCreate },
    }));
  });

  it('旧形式の全対象を専用鍵へ移し、件数だけを監査する', async () => {
    mocks.findMany.mockResolvedValue([{ id: 41, totpSecret: 'encrypted-payload' }]);
    mocks.decrypt.mockReturnValue('synthetic-plaintext');
    mocks.encrypt.mockReturnValue('new-encrypted-payload');
    mocks.updateMany.mockResolvedValue({ count: 1 });
    mocks.auditCreate.mockResolvedValue({ id: 1 });

    await expect(reencryptLegacyTotpSecrets(input)).resolves.toEqual({
      sourceKeyVersion: 'totp-old-v1', targetKeyVersion: 'totp-v1', candidateCount: 1, reencryptedCount: 1, failedCount: 0,
    });
    expect(mocks.updateMany).toHaveBeenCalledWith({
      where: { id: 41, totpKeyVersion: 'totp-old-v1' },
      data: { totpSecret: 'new-encrypted-payload', totpKeyVersion: 'totp-v1' },
    });
  });

  it('復号失敗時は更新せず監査して停止する', async () => {
    mocks.findMany.mockResolvedValue([{ id: 41, totpSecret: 'encrypted-payload' }]);
    mocks.decrypt.mockImplementation(() => { throw new Error('synthetic failure'); });
    mocks.auditCreate.mockResolvedValue({ id: 1 });

    await expect(reencryptLegacyTotpSecrets(input)).rejects.toThrow('TOTP re-encryption failed before any record was updated.');
    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(mocks.auditCreate).toHaveBeenCalledWith({ data: expect.objectContaining({ candidateCount: 1, failedCount: 1 }) });
  });
});
