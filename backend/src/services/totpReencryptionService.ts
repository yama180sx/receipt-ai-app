import { globalPrisma } from '../utils/prismaClient';
import {
  CURRENT_TOTP_KEY_VERSION,
  LEGACY_TOTP_KEY_VERSION,
  decryptTotpSecret,
  encryptTotpSecret,
} from '../utils/totpCrypto';
import type { TotpReencryptionInput } from './totpReencryptionInput';

export type TotpReencryptionResult = {
  sourceKeyVersion: string;
  targetKeyVersion: string;
  candidateCount: number;
  reencryptedCount: number;
  failedCount: number;
};

/**
 * 旧JWT由来のTOTP暗号文だけを専用鍵へ移す。
 * 値、メンバー名、IDは返さず、失敗時は更新前に停止する。
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
      const plaintext = decryptTotpSecret(candidate.totpSecret, LEGACY_TOTP_KEY_VERSION);
      replacements.push({ id: candidate.id, encryptedSecret: encryptTotpSecret(plaintext) });
    }
  } catch {
    result.failedCount = 1;
    await globalPrisma.totpSecretReencryptionAudit.create({
      data: { ...input, ...result },
    });
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
    if (updated !== candidates.length) {
      throw new Error('TOTP candidate set changed during re-encryption.');
    }
    await tx.totpSecretReencryptionAudit.create({
      data: { ...input, ...result, reencryptedCount: updated },
    });
    return updated;
  });

  return { ...result, reencryptedCount };
}
