import { InvitationCodeRotationAction, InvitationCodeRotationStatus, Prisma } from '@prisma/client';
import type { InvitationCodeRollbackManifest, InvitationCodeRotationPlan, InvitationCodeRotationTarget } from '../services/invitationCodeRotation';
import { globalPrisma } from '../utils/prismaClient';

const invitationCodeRotationAdvisoryLock = 131007;

export async function listInvitationCodeRotationTargets(): Promise<InvitationCodeRotationTarget[]> {
  const familyGroups = await globalPrisma.familyGroup.findMany({
    select: { id: true, inviteCode: true },
    orderBy: { id: 'asc' },
  });
  return familyGroups.map(({ id, inviteCode }) => ({ familyGroupId: id, inviteCode }));
}

/** root専用の全世帯横断操作。通常のtenant Prismaを使用してはならない。 */
export async function applyInvitationCodeRotation(plan: InvitationCodeRotationPlan) {
  return globalPrisma.$transaction(async (tx) => {
    await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(${invitationCodeRotationAdvisoryLock})`);
    const currentTargets = await tx.familyGroup.findMany({
      select: { id: true, inviteCode: true },
      orderBy: { id: 'asc' },
    });
    const plannedIds = plan.records.map(({ familyGroupId }) => familyGroupId);
    if (
      currentTargets.length !== plannedIds.length ||
      currentTargets.some((target, index) => target.id !== plannedIds[index])
    ) {
      throw new Error('Invitation-code rotation target set changed before update.');
    }

    const currentCodes = new Set(currentTargets.map(({ inviteCode }) => inviteCode));
    for (const { rotatedInviteCode } of plan.records) {
      if (currentCodes.has(rotatedInviteCode)) {
        throw new Error('A generated invitation code conflicts with the current target set.');
      }
    }

    for (const { familyGroupId, rotatedInviteCode } of plan.records) {
      await tx.familyGroup.update({
        where: { id: familyGroupId },
        data: { inviteCode: rotatedInviteCode },
      });
    }
    await tx.invitationCodeRotationAudit.create({
      data: {
        rotationId: plan.rotationId,
        action: InvitationCodeRotationAction.ROTATED,
        status: InvitationCodeRotationStatus.SUCCEEDED,
        targetCount: plan.records.length,
        rotatedCount: plan.records.length,
        failedCount: 0,
      },
    });
    return { targetCount: plan.records.length, rotatedCount: plan.records.length, failedCount: 0 };
  });
}

export async function recordFailedInvitationCodeRotation(rotationId: string, targetCount: number) {
  return globalPrisma.invitationCodeRotationAudit.create({
    data: {
      rotationId,
      action: InvitationCodeRotationAction.ROTATED,
      status: InvitationCodeRotationStatus.FAILED,
      targetCount,
      rotatedCount: 0,
      failedCount: targetCount,
    },
  });
}

/** root専用rollback。現在のコードが同一rotationの新コードと全件一致する場合だけ戻す。 */
export async function rollbackInvitationCodes(manifest: InvitationCodeRollbackManifest) {
  return globalPrisma.$transaction(async (tx) => {
    await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(${invitationCodeRotationAdvisoryLock})`);
    const currentTargets = await tx.familyGroup.findMany({
      select: { id: true, inviteCode: true },
      orderBy: { id: 'asc' },
    });
    const records = [...manifest.codes].sort((left, right) => left.familyGroupId - right.familyGroupId);
    if (
      currentTargets.length !== records.length ||
      currentTargets.some((target, index) => target.id !== records[index]?.familyGroupId || target.inviteCode !== records[index]?.rotatedInviteCode)
    ) {
      throw new Error('Invitation-code rollback precondition is not met.');
    }
    const previousCodes = new Set(records.map(({ previousInviteCode }) => previousInviteCode));
    if (previousCodes.size !== records.length) throw new Error('Invitation-code rollback manifest is invalid.');

    for (const { familyGroupId, previousInviteCode } of records) {
      await tx.familyGroup.update({
        where: { id: familyGroupId },
        data: { inviteCode: previousInviteCode },
      });
    }
    await tx.invitationCodeRotationAudit.create({
      data: {
        rotationId: manifest.rotationId,
        action: InvitationCodeRotationAction.ROLLED_BACK,
        status: InvitationCodeRotationStatus.SUCCEEDED,
        targetCount: records.length,
        rotatedCount: records.length,
        failedCount: 0,
      },
    });
    return { targetCount: records.length, restoredCount: records.length, failedCount: 0 };
  });
}
