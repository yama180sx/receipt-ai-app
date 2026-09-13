import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  auditCreate: vi.fn(),
  updateMany: vi.fn(),
  transaction: vi.fn(),
  decrypt: vi.fn(),
  encrypt: vi.fn(),
}));

vi.mock('../utils/prismaClient', () => ({
  globalPrisma: {
    familyMember: { findMany: mocks.findMany },
    totpSecretReencryptionAudit: { create: mocks.auditCreate },
    $transaction: mocks.transaction,
  },
}));

vi.mock('../utils/totpCrypto', () => ({
  CURRENT_TOTP_KEY_VERSION: 'totp-v1',
  LEGACY_TOTP_KEY_VERSION: 'legacy-jwt-v1',
  decryptTotpSecret: mocks.decrypt,
  encryptTotpSecret: mocks.encrypt,
}));

import { reencryptLegacyTotpSecrets } from './totpReencryptionService';

const input = { operatorName: 'root-maintainer', reason: 'planned key separation' };

describe('TOTP再暗号化サービス', () => {
  beforeEach(() => {
    mocks.findMany.mockReset();
    mocks.auditCreate.mockReset();
    mocks.updateMany.mockReset();
    mocks.transaction.mockReset();
    mocks.decrypt.mockReset();
    mocks.encrypt.mockReset();
    mocks.transaction.mockImplementation((callback) => callback({
      familyMember: { updateMany: mocks.updateMany },
      totpSecretReencryptionAudit: { create: mocks.auditCreate },
    }));
  });

  it('旧鍵バージョンの全対象を専用鍵バージョンへ移し、集計だけを監査する', async () => {
    mocks.findMany.mockResolvedValue([{ id: 41, totpSecret: 'encrypted-payload' }]);
    mocks.decrypt.mockReturnValue('synthetic-plaintext');
    mocks.encrypt.mockReturnValue('new-encrypted-payload');
    mocks.updateMany.mockResolvedValue({ count: 1 });
    mocks.auditCreate.mockResolvedValue({ id: 1 });

    await expect(reencryptLegacyTotpSecrets(input)).resolves.toEqual({
      sourceKeyVersion: 'legacy-jwt-v1',
      targetKeyVersion: 'totp-v1',
      candidateCount: 1,
      reencryptedCount: 1,
      failedCount: 0,
    });
    expect(mocks.decrypt).toHaveBeenCalledWith('encrypted-payload', 'legacy-jwt-v1');
    expect(mocks.updateMany).toHaveBeenCalledWith({
      where: { id: 41, totpKeyVersion: 'legacy-jwt-v1' },
      data: { totpSecret: 'new-encrypted-payload', totpKeyVersion: 'totp-v1' },
    });
    expect(mocks.auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        ...input,
        candidateCount: 1,
        reencryptedCount: 1,
        failedCount: 0,
      }),
    });
  });

  it('復号失敗時は更新せず、失敗件数だけを監査して停止する', async () => {
    mocks.findMany.mockResolvedValue([{ id: 41, totpSecret: 'encrypted-payload' }]);
    mocks.decrypt.mockImplementation(() => { throw new Error('synthetic decryption failure'); });
    mocks.auditCreate.mockResolvedValue({ id: 2 });

    await expect(reencryptLegacyTotpSecrets(input))
      .rejects.toThrow('TOTP re-encryption failed before any record was updated.');
    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(mocks.auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ candidateCount: 1, reencryptedCount: 0, failedCount: 1 }),
    });
  });
});
