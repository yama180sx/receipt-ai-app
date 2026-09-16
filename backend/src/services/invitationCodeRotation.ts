import { randomBytes } from 'node:crypto';

export type InvitationCodeRotationTarget = {
  familyGroupId: number;
  inviteCode: string;
};

export type InvitationCodeRotationRecord = {
  familyGroupId: number;
  previousInviteCode: string;
  rotatedInviteCode: string;
};

export type InvitationCodeRotationPlan = {
  rotationId: string;
  records: InvitationCodeRotationRecord[];
};

export type InvitationCodeRollbackManifest = {
  rotationId: string;
  codes: InvitationCodeRotationRecord[];
};

const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const codeLength = 24;

function generateInviteCode(random: (size: number) => Buffer): string {
  const bytes = random(codeLength);
  let code = '';
  for (const byte of bytes) code += alphabet[byte % alphabet.length];
  return `RC-${code.slice(0, 6)}-${code.slice(6, 12)}-${code.slice(12, 18)}-${code.slice(18)}`;
}

/**
 * 値の表示・永続化を行わない再発行計画を生成する。
 * 実際の更新は、root専用CLIからrepositoryのtransactionでだけ実行する。
 */
export function createInvitationCodeRotationPlan(
  targets: InvitationCodeRotationTarget[],
  rotationId: string,
  random: (size: number) => Buffer = randomBytes
): InvitationCodeRotationPlan {
  if (!/^[a-z0-9][a-z0-9-]{7,79}$/.test(rotationId)) {
    throw new Error('rotation ID is invalid.');
  }
  if (targets.length === 0) throw new Error('No family groups are available for invitation-code rotation.');

  const existingCodes = new Set(targets.map(({ inviteCode }) => inviteCode));
  const familyGroupIds = new Set<number>();
  const rotatedCodes = new Set<string>();
  const records: InvitationCodeRotationRecord[] = [];

  for (const target of targets) {
    if (!Number.isSafeInteger(target.familyGroupId) || target.familyGroupId <= 0 || familyGroupIds.has(target.familyGroupId)) {
      throw new Error('Invitation-code rotation targets are invalid.');
    }
    familyGroupIds.add(target.familyGroupId);

    let rotatedInviteCode: string;
    do {
      rotatedInviteCode = generateInviteCode(random);
    } while (existingCodes.has(rotatedInviteCode) || rotatedCodes.has(rotatedInviteCode));
    rotatedCodes.add(rotatedInviteCode);
    records.push({
      familyGroupId: target.familyGroupId,
      previousInviteCode: target.inviteCode,
      rotatedInviteCode,
    });
  }

  return { rotationId, records };
}

export function invitationCodeDeliveryManifest(plan: InvitationCodeRotationPlan) {
  return {
    rotationId: plan.rotationId,
    codes: plan.records.map(({ familyGroupId, rotatedInviteCode }) => ({ familyGroupId, inviteCode: rotatedInviteCode })),
  };
}

export function invitationCodeRollbackManifest(plan: InvitationCodeRotationPlan): InvitationCodeRollbackManifest {
  return {
    rotationId: plan.rotationId,
    codes: plan.records.map(({ familyGroupId, previousInviteCode, rotatedInviteCode }) => ({
      familyGroupId,
      previousInviteCode,
      rotatedInviteCode,
    })),
  };
}

/** encrypted rollback artifactを読む前の構造検証。値を例外文に含めない。 */
export function parseInvitationCodeRollbackManifest(value: unknown): InvitationCodeRollbackManifest {
  if (!value || typeof value !== 'object') throw new Error('Rollback manifest is invalid.');
  const candidate = value as { rotationId?: unknown; codes?: unknown };
  if (!/^[a-z0-9][a-z0-9-]{7,79}$/.test(String(candidate.rotationId ?? '')) || !Array.isArray(candidate.codes) || candidate.codes.length === 0) {
    throw new Error('Rollback manifest is invalid.');
  }
  const ids = new Set<number>();
  const codes = candidate.codes.map((entry) => {
    if (!entry || typeof entry !== 'object') throw new Error('Rollback manifest is invalid.');
    const record = entry as Partial<InvitationCodeRotationRecord>;
    const familyGroupId = record.familyGroupId;
    if (typeof familyGroupId !== 'number' || !Number.isSafeInteger(familyGroupId) || !record.previousInviteCode || !record.rotatedInviteCode || ids.has(familyGroupId)) {
      throw new Error('Rollback manifest is invalid.');
    }
    ids.add(familyGroupId);
    return {
      familyGroupId,
      previousInviteCode: record.previousInviteCode,
      rotatedInviteCode: record.rotatedInviteCode,
    };
  });
  return { rotationId: String(candidate.rotationId), codes };
}
