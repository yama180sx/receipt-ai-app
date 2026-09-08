import { AiBudgetReservationStatus, AiUsagePurpose, Prisma } from '@prisma/client';
import { globalPrisma, prisma } from '../utils/prismaClient';

export async function findGlobalAiBudgetSetting() {
  return prisma.globalAiBudgetSetting.findUnique({ where: { id: 1 } });
}

export async function upsertGlobalAiBudgetSetting(data: {
  isEnabled: boolean; monthlyBudgetJpy: Prisma.Decimal | null; warningPercent: number; criticalPercent: number; stopPercent: number; notifyDiscord: boolean; notificationEmails: string[];
}) {
  return prisma.globalAiBudgetSetting.upsert({ where: { id: 1 }, create: { id: 1, ...data }, update: data });
}

export async function createGlobalAiBudgetAudit(input: { actorMemberId?: number; operatorName?: string; action: string; reason?: string; beforeValue?: Prisma.InputJsonValue; afterValue?: Prisma.InputJsonValue }) {
  return prisma.globalAiBudgetAudit.create({ data: input });
}

export async function isGlobalAiBudgetManager(memberId: number) {
  const manager = await prisma.globalAiBudgetManager.findUnique({
    where: { memberId },
    include: { member: { select: { role: true, totpEnabled: true } } },
  });
  return Boolean(manager && manager.member.role === 'ADMIN' && manager.member.totpEnabled);
}

export async function listGlobalAiBudgetManagers() {
  return prisma.globalAiBudgetManager.findMany({
    include: { member: { select: { id: true, name: true, familyGroupId: true, role: true, totpEnabled: true } } },
    orderBy: { id: 'asc' },
  });
}

/** 既存の全体AI予算管理者が、画面から追加できる候補だけを返す。 */
export async function listGlobalAiBudgetManagerCandidates() {
  return globalPrisma.familyMember.findMany({
    where: { role: 'ADMIN', totpEnabled: true, globalAiBudgetManager: null },
    select: {
      id: true,
      name: true,
      familyGroupId: true,
      role: true,
      totpEnabled: true,
      familyGroup: { select: { name: true } },
    },
    orderBy: [{ familyGroup: { name: 'asc' } }, { name: 'asc' }, { id: 'asc' }],
  });
}

export async function addGlobalAiBudgetManager(memberId: number) {
  return prisma.globalAiBudgetManager.create({ data: { memberId } });
}

export type RemoveGlobalAiBudgetManagerResult = 'removed' | 'not_found' | 'last_effective_manager';

/**
 * 管理者行だけでなく、ADMINかつTOTP有効な「実効管理者」を基準に最後の一人を守る。
 * SERIALIZABLE により、並行した削除で実効管理者が0人になることも防ぐ。
 */
export async function removeGlobalAiBudgetManager(memberId: number): Promise<RemoveGlobalAiBudgetManagerResult> {
  return prisma.$transaction(async (tx) => {
    const target = await tx.globalAiBudgetManager.findUnique({
      where: { memberId },
      include: { member: { select: { role: true, totpEnabled: true } } },
    });
    if (!target) return 'not_found';
    const targetIsEffective = target.member.role === 'ADMIN' && target.member.totpEnabled;
    if (targetIsEffective) {
      const effectiveCount = await tx.globalAiBudgetManager.count({
        where: { member: { is: { role: 'ADMIN', totpEnabled: true } } },
      });
      if (effectiveCount <= 1) return 'last_effective_manager';
    }
    await tx.globalAiBudgetManager.delete({ where: { memberId } });
    return 'removed';
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function findEligibleGlobalAiBudgetManagerMember(memberId: number) {
  return globalPrisma.familyMember.findFirst({
    where: { id: memberId, role: 'ADMIN', totpEnabled: true },
    select: { id: true, name: true, familyGroupId: true, role: true, totpEnabled: true },
  });
}

/**
 * 初期登録・復旧登録専用。通常APIとは分離し、有効な管理者が0人の場合だけ実行を許可する。
 */
export async function bootstrapGlobalAiBudgetManager(input: { memberId: number; operatorName: string; reason: string }) {
  return prisma.$transaction(async (tx) => {
    const effectiveManagerCount = await tx.globalAiBudgetManager.count({
      where: { member: { is: { role: 'ADMIN', totpEnabled: true } } },
    });
    if (effectiveManagerCount > 0) throw new Error('有効な全体AI予算管理者は既に登録されています。通常の管理画面から追加してください。');
    const member = await tx.familyMember.findFirst({
      where: { id: input.memberId, role: 'ADMIN', totpEnabled: true },
      select: { id: true, name: true, familyGroupId: true, role: true, totpEnabled: true },
    });
    if (!member) throw new Error('対象者はTOTP有効なADMINである必要があります。');
    const manager = await tx.globalAiBudgetManager.create({ data: { memberId: member.id } });
    await tx.globalAiBudgetAudit.create({
      data: {
        operatorName: input.operatorName,
        action: 'initial_manager_bootstrapped',
        reason: input.reason,
        afterValue: { memberId: member.id, executionPath: 'deployment-cli' },
      },
    });
    return { manager, member };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function resumeGlobalAiBudget(actorMemberId: number, reason: string) {
  return prisma.$transaction(async (tx) => {
    const before = await tx.globalAiBudgetSetting.findUnique({ where: { id: 1 } });
    if (!before) throw new Error('Global AI budget setting is not configured.');
    const setting = await tx.globalAiBudgetSetting.update({
      where: { id: 1 },
      data: { isStopped: false, stoppedAt: null, stoppedReason: null },
    });
    await tx.globalAiBudgetAudit.create({
      data: { actorMemberId, action: 'resumed', reason, beforeValue: JSON.parse(JSON.stringify(before)), afterValue: JSON.parse(JSON.stringify(setting)) },
    });
    return setting;
  });
}

export async function stopGlobalAiBudget(reason: string) {
  return prisma.globalAiBudgetSetting.updateMany({
    where: { id: 1, isStopped: false },
    data: { isStopped: true, stoppedReason: reason, stoppedAt: new Date() },
  });
}

export async function listActiveBudgetReservations() {
  return prisma.aiBudgetReservation.findMany({
    where: { status: AiBudgetReservationStatus.RESERVED, expiresAt: { gt: new Date() } },
    select: { reservedCostJpy: true },
  });
}

export async function createBudgetReservation(input: {
  purpose: AiUsagePurpose;
  pricingRevisionId: number;
  jobKey: string;
  reservedCostJpy: Prisma.Decimal;
  expiresAt: Date;
}) {
  return prisma.aiBudgetReservation.create({ data: input });
}

/** 予約と通知候補を同じDBトランザクションで永続化する。配送自体は後続Workerの責務。 */
export async function createBudgetReservationWithNotificationDeliveries(input: {
  purpose: AiUsagePurpose; pricingRevisionId: number; jobKey: string; reservedCostJpy: Prisma.Decimal; expiresAt: Date;
}, deliveries: Array<{ dedupeKey: string; kind: 'THRESHOLD'; month: string; thresholdPercent: number; channel: 'DISCORD' | 'EMAIL'; recipient: string }>) {
  return prisma.$transaction(async (tx) => {
    const reservation = await tx.aiBudgetReservation.create({ data: input });
    if (deliveries.length) await tx.aiBudgetNotificationDelivery.createMany({ data: deliveries, skipDuplicates: true });
    return reservation;
  });
}

export async function releaseBudgetReservation(jobKey: string) {
  return prisma.aiBudgetReservation.updateMany({
    where: { jobKey, status: AiBudgetReservationStatus.RESERVED },
    data: { status: AiBudgetReservationStatus.RELEASED, settledAt: new Date() },
  });
}

export async function expireBudgetReservations() {
  return prisma.aiBudgetReservation.updateMany({
    where: { status: AiBudgetReservationStatus.RESERVED, expiresAt: { lte: new Date() } },
    data: { status: AiBudgetReservationStatus.EXPIRED, settledAt: new Date() },
  });
}
