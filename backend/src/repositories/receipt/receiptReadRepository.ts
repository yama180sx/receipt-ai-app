import { Prisma } from '@prisma/client';
import { prisma } from '../../utils/prismaClient';
import type { PrismaTx } from '../../utils/prismaTransaction';
import { AppError } from '../../utils/appError';
import { getLocalMonthDateRange, normalizeYearMonth } from '../../utils/yearMonth';
import {
  receiptWithItemsCategory,
  receiptWithItemsCategorySplits,
} from './receiptIncludes';

export type ListReceiptsParams = {
  familyGroupId: number;
  memberId?: string;
  month?: string;
};

function buildListWhere(params: ListReceiptsParams): Prisma.ReceiptWhereInput {
  const { familyGroupId, memberId, month } = params;
  const where: Prisma.ReceiptWhereInput = { familyGroupId };

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

  return where;
}

export async function findReceipts(params: ListReceiptsParams) {
  return prisma.receipt.findMany({
    where: buildListWhere(params),
    include: receiptWithItemsCategorySplits,
    orderBy: { date: 'desc' },
  });
}

export async function findLatestReceipt(familyGroupId: number) {
  return prisma.receipt.findFirst({
    where: { familyGroupId },
    orderBy: { createdAt: 'desc' },
    include: receiptWithItemsCategorySplits,
  });
}

export async function findReceiptById(
  id: number,
  include: Prisma.ReceiptInclude = receiptWithItemsCategory
) {
  return prisma.receipt.findUnique({ where: { id }, include });
}

export async function findReceiptByImagePath(
  familyGroupId: number,
  imagePath: string,
  include: Prisma.ReceiptInclude = receiptWithItemsCategory
) {
  return prisma.receipt.findFirst({
    where: { familyGroupId, imagePath },
    include,
  });
}

export async function findReceiptIdByImagePath(familyGroupId: number, imagePath: string) {
  return prisma.receipt.findFirst({
    where: { familyGroupId, imagePath },
    select: { id: true },
  });
}

export async function findReceiptForDuplicate(
  where: Prisma.ReceiptWhereInput,
  select: Prisma.ReceiptSelect = { id: true }
) {
  return prisma.receipt.findFirst({ where, select });
}

export async function listFamilyMembers(familyGroupId: number) {
  return prisma.familyMember.findMany({
    where: { familyGroupId },
    select: { id: true, name: true },
    orderBy: { id: 'asc' },
  });
}

export async function findMemberById(memberId: number) {
  return prisma.familyMember.findUnique({
    where: { id: memberId },
    select: { familyGroupId: true },
  });
}

export async function findReceiptByIdInTx(
  tx: PrismaTx,
  id: number,
  include: Prisma.ReceiptInclude = receiptWithItemsCategory
) {
  return tx.receipt.findUnique({ where: { id }, include });
}

export async function findReceiptByIdForTenantInTx(
  tx: PrismaTx,
  receiptId: number,
  familyGroupId: number
) {
  const existing = await tx.receipt.findUnique({ where: { id: receiptId } });
  if (!existing || existing.familyGroupId !== familyGroupId) {
    throw new AppError('ReceiptNotFound', 404);
  }
  return existing;
}

export async function findItemWithReceiptInTx(tx: PrismaTx, itemId: number) {
  return tx.item.findUnique({
    where: { id: itemId },
    include: { receipt: true },
  });
}

export async function findCategoryByIdInTx(
  tx: PrismaTx,
  categoryId: number,
  familyGroupId: number
) {
  return tx.category.findFirst({
    where: { id: categoryId, familyGroupId },
  });
}

export async function findItemSplitsInTx(tx: PrismaTx, itemId: number) {
  return tx.itemSplit.findMany({ where: { itemId } });
}

export async function findFamilyMembersByIdsInTx(
  tx: PrismaTx,
  memberIds: number[],
  familyGroupId: number
) {
  return tx.familyMember.findMany({
    where: { id: { in: memberIds }, familyGroupId },
    select: { id: true },
  });
}
