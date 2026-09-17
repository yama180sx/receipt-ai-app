import { globalPrisma } from '../utils/prismaClient';
import { CURRENT_TOTP_KEY_VERSION, encryptTotpSecret } from '../utils/totpCrypto';
import { decryptLegacyTotpSecretForMigration } from '../utils/totpLegacyMigrationCrypto';
import type { TotpReencryptionInput } from './totpReencryptionInput';

const LEGACY_TOTP_KEY_VERSION = 'totp-old-v1';

export type TotpReencryptionResult = {
  sourceKeyVersion: string;
  targetKeyVersion: string;
  candidateCount: number;
  reencryptedCount: number;
  failedCount: number;
};

/**
 * 旧JWT由来の暗号文だけを専用TOTP鍵へ移す一回限りの管理操作。
 * 復号を完了してからtransactionで更新するため、途中失敗で一部だけ更新しない。
 */
export async function reencryptLegacyTotpSecrets(
  input: TotpReencryptionInput
): Promise<TotpReencryptionResult> {
  const candidates = await globalPrisma.familyMember.findMany({
    where: { totpSecret: { not: null }, totpKeyVersion: LEGACY_TOTP_KEY_VERSION },
    select: { id: true, totpSecret: true },
    orderBy: { id: 'asc' },
  });
  const result = {
    sourceKeyVersion: LEGACY_TOTP_KEY_VERSION,
    targetKeyVersion: CURRENT_TOTP_KEY_VERSION,
    candidateCount: candidates.length,
    reencryptedCount: 0,
    failedCount: 0,
  };
  const replacements: Array<{ id: number; encryptedSecret: string }> = [];

  try {
    for (const candidate of candidates) {
      if (!candidate.totpSecret) throw new Error('candidate payload is unavailable');
      replacements.push({
        id: candidate.id,
        encryptedSecret: encryptTotpSecret(decryptLegacyTotpSecretForMigration(candidate.totpSecret)),
      });
    }
  } catch {
    result.failedCount = 1;
    await globalPrisma.totpSecretReencryptionAudit.create({ data: { ...input, ...result } });
    throw new Error('TOTP re-encryption failed before any record was updated.');
  }

  const reencryptedCount = await globalPrisma.$transaction(async (tx) => {
    const updates = await Promise.all(replacements.map(({ id, encryptedSecret }) =>
      tx.familyMember.updateMany({
        where: { id, totpKeyVersion: LEGACY_TOTP_KEY_VERSION },
        data: { totpSecret: encryptedSecret, totpKeyVersion: CURRENT_TOTP_KEY_VERSION },
      })
    ));
    const updated = updates.reduce((total, update) => total + update.count, 0);
    if (updated !== candidates.length) throw new Error('TOTP candidate set changed during re-encryption.');
    await tx.totpSecretReencryptionAudit.create({ data: { ...input, ...result, reencryptedCount: updated } });
    return updated;
  });
  return { ...result, reencryptedCount };
}
