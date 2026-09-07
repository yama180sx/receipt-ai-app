import { AiBudgetReservationStatus, AiUsagePurpose, Prisma } from '@prisma/client';
import { prisma } from '../utils/prismaClient';

export async function findGlobalAiBudgetSetting() {
  return prisma.globalAiBudgetSetting.findUnique({ where: { id: 1 } });
}

export async function upsertGlobalAiBudgetSetting(data: {
  isEnabled: boolean; monthlyBudgetJpy: Prisma.Decimal | null; warningPercent: number; criticalPercent: number; stopPercent: number; notifyDiscord: boolean; notificationEmails: string[];
}) {
  return prisma.globalAiBudgetSetting.upsert({ where: { id: 1 }, create: { id: 1, ...data }, update: data });
}

export async function createGlobalAiBudgetAudit(input: { actorMemberId?: number; action: string; reason?: string; beforeValue?: Prisma.InputJsonValue; afterValue?: Prisma.InputJsonValue }) {
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

export async function addGlobalAiBudgetManager(memberId: number) {
  return prisma.globalAiBudgetManager.create({ data: { memberId } });
}

export async function removeGlobalAiBudgetManager(memberId: number) {
  return prisma.$transaction(async (tx) => {
    const count = await tx.globalAiBudgetManager.count();
    if (count <= 1) return false;
    const result = await tx.globalAiBudgetManager.deleteMany({ where: { memberId } });
    return result.count > 0;
  });
}

export async function findEligibleGlobalAiBudgetManagerMember(memberId: number) {
  return prisma.familyMember.findFirst({
    where: { id: memberId, role: 'ADMIN', totpEnabled: true },
    select: { id: true, name: true, familyGroupId: true, role: true, totpEnabled: true },
  });
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
