import { AiBudgetReservationStatus, AiUsagePurpose, Prisma } from '@prisma/client';
import { prisma } from '../utils/prismaClient';

export async function findGlobalAiBudgetSetting() {
  return prisma.globalAiBudgetSetting.findUnique({ where: { id: 1 } });
}

export async function upsertGlobalAiBudgetSetting(data: {
  isEnabled: boolean; monthlyBudgetJpy: Prisma.Decimal | null; warningPercent: number; criticalPercent: number; stopPercent: number;
}) {
  return prisma.globalAiBudgetSetting.upsert({ where: { id: 1 }, create: { id: 1, ...data }, update: data });
}

export async function createGlobalAiBudgetAudit(input: { actorMemberId: number; action: string; reason?: string; beforeValue?: Prisma.InputJsonValue; afterValue?: Prisma.InputJsonValue }) {
  return prisma.globalAiBudgetAudit.create({ data: input });
}

export async function isGlobalAiBudgetManager(memberId: number) {
  const manager = await prisma.globalAiBudgetManager.findUnique({
    where: { memberId },
    include: { member: { select: { role: true, totpEnabled: true } } },
  });
  return Boolean(manager && manager.member.role === 'ADMIN' && manager.member.totpEnabled);
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
