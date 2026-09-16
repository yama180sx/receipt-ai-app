import { AiBudgetNotificationChannel, AiBudgetNotificationKind, AiBudgetNotificationStatus } from '@prisma/client';
import { prisma } from '../utils/prismaClient';

export type CreateDelivery = { dedupeKey: string; kind: AiBudgetNotificationKind; month: string; thresholdPercent: number; channel: AiBudgetNotificationChannel; recipient: string };

export function createNotificationDeliveries(inputs: CreateDelivery[]) {
  if (!inputs.length) return Promise.resolve({ count: 0 });
  return prisma.aiBudgetNotificationDelivery.createMany({ data: inputs, skipDuplicates: true });
}

export function findNotificationDelivery(id: number) { return prisma.aiBudgetNotificationDelivery.findUnique({ where: { id } }); }
export function listPendingNotificationDeliveries() {
  return prisma.aiBudgetNotificationDelivery.findMany({ where: { status: AiBudgetNotificationStatus.PENDING, attempts: { lt: 3 }, OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: new Date() } }] }, select: { id: true } });
}
export function listNotificationDeliveries() { return prisma.aiBudgetNotificationDelivery.findMany({ orderBy: { createdAt: 'desc' }, take: 100 }); }
export function startNotificationDelivery(id: number) {
  return prisma.aiBudgetNotificationDelivery.update({ where: { id }, data: { status: AiBudgetNotificationStatus.PROCESSING, attempts: { increment: 1 }, lastError: null } });
}
export function completeNotificationDelivery(id: number) { return prisma.aiBudgetNotificationDelivery.update({ where: { id }, data: { status: AiBudgetNotificationStatus.SUCCEEDED, sentAt: new Date(), nextAttemptAt: null } }); }
export function failNotificationDelivery(id: number, attempts: number, error: string) {
  const terminal = attempts >= 3;
  return prisma.aiBudgetNotificationDelivery.update({ where: { id }, data: { status: terminal ? AiBudgetNotificationStatus.FAILED : AiBudgetNotificationStatus.PENDING, lastError: error.slice(0, 1000), nextAttemptAt: terminal ? null : new Date(Date.now() + 1000 * 2 ** attempts) } });
}
