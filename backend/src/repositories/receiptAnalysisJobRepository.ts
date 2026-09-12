import { ReceiptAnalysisJobStatus } from '@prisma/client';
import { prisma } from '../utils/prismaClient';

export async function createReceiptAnalysisJob(input: { familyGroupId: number; memberId: number; imagePath: string }) {
  return prisma.receiptAnalysisJob.create({ data: input });
}

export async function findReceiptAnalysisJob(id: string, familyGroupId: number, memberId?: number) {
  return prisma.receiptAnalysisJob.findFirst({ where: { id, familyGroupId, ...(memberId ? { memberId } : {}) } });
}

export async function listReceiptAnalysisJobsForMember(familyGroupId: number, memberId: number) {
  return prisma.receiptAnalysisJob.findMany({ where: { familyGroupId, memberId }, orderBy: { createdAt: 'desc' } });
}

export async function findReceiptAnalysisJobByImagePath(familyGroupId: number, imagePath: string) {
  return prisma.receiptAnalysisJob.findFirst({ where: { familyGroupId, imagePath }, select: { id: true } });
}

export async function updateReceiptAnalysisJob(id: string, data: {
  status?: ReceiptAnalysisJobStatus; failureCode?: string | null; failureReason?: string | null;
  manualRetryCount?: number; lastEnqueuedAt?: Date;
}) {
  return prisma.receiptAnalysisJob.update({ where: { id }, data });
}

export async function deleteReceiptAnalysisJob(id: string, familyGroupId: number, memberId: number) {
  await prisma.receiptAnalysisJob.deleteMany({ where: { id, familyGroupId, memberId } });
}

export async function listRecoverableReceiptAnalysisJobs(input: { force: boolean; limit: number }) {
  const staleBefore = new Date(Date.now() - 10 * 60_000);
  return prisma.receiptAnalysisJob.findMany({
    where: {
      status: { in: [ReceiptAnalysisJobStatus.QUEUED, ReceiptAnalysisJobStatus.PROCESSING, ReceiptAnalysisJobStatus.AWAITING_CONFIRMATION] },
      ...(input.force ? {} : { OR: [{ lastEnqueuedAt: null }, { lastEnqueuedAt: { lte: staleBefore } }] }),
    },
    orderBy: { updatedAt: 'asc' },
    take: input.limit,
  });
}
