import { prisma } from '../../utils/prismaClient';
import { AppError } from '../../utils/appError';
import { getLocalMonthDateRange, normalizeYearMonth } from '../../utils/yearMonth';

export type ListReceiptsParams = {
  familyGroupId: number;
  memberId?: string;
  month?: string;
};

export async function listReceipts(params: ListReceiptsParams) {
  const { familyGroupId, memberId, month } = params;

  const where: { familyGroupId: number; memberId?: number; date?: { gte: Date; lt: Date } } = {
    familyGroupId,
  };

  if (memberId !== undefined && memberId !== null && String(memberId).trim() !== '') {
    const filterMemberId = Number(memberId);
    if (!Number.isNaN(filterMemberId)) {
      where.memberId = filterMemberId;
    }
  }

  const normalizedMonth = normalizeYearMonth(typeof month === 'string' ? month : undefined);
  if (normalizedMonth) {
    const { start, end } = getLocalMonthDateRange(normalizedMonth);
    where.date = { gte: start, lt: end };
  }

  return prisma.receipt.findMany({
    where,
    include: { items: { include: { category: true, splits: true } } },
    orderBy: { date: 'desc' },
  });
}

export async function getLatestReceipt(familyGroupId: number) {
  return prisma.receipt.findFirst({
    where: { familyGroupId },
    orderBy: { createdAt: 'desc' },
    include: { items: { include: { category: true, splits: true } } },
  });
}

export async function deleteReceiptById(receiptId: number, familyGroupId: number) {
  const existing = await prisma.receipt.findUnique({ where: { id: receiptId } });
  if (!existing || existing.familyGroupId !== familyGroupId) {
    throw new AppError('ReceiptNotFound', 404);
  }

  await prisma.receipt.delete({ where: { id: receiptId } });
}

export async function listFamilyMembers(familyGroupId: number) {
  return prisma.familyMember.findMany({
    where: { familyGroupId },
    select: { id: true, name: true },
    orderBy: { id: 'asc' },
  });
}
