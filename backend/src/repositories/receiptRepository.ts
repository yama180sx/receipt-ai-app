import { Prisma } from '@prisma/client';
import { prisma } from '../utils/prismaClient';
import type { PrismaTx } from '../utils/prismaTransaction';
import { AppError } from '../utils/appError';
import { getLocalMonthDateRange, normalizeYearMonth } from '../utils/yearMonth';

export const receiptWithItemsCategorySplits = {
  items: { include: { category: true, splits: true } },
} satisfies Prisma.ReceiptInclude;

export const receiptWithItemsCategory = {
  items: { include: { category: true } },
} satisfies Prisma.ReceiptInclude;

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

export async function findMemberById(memberId: number) {
  return prisma.familyMember.findUnique({
    where: { id: memberId },
    select: { familyGroupId: true },
  });
}

export type ReceiptCreateWithItemsInput = {
  memberId: number;
  familyGroupId: number;
  storeName: string;
  date: Date;
  totalAmount: number;
  taxAmount: number;
  imagePath: string;
  rawText: string;
  items: Array<{
    name: string;
    price: number;
    quantity: number;
    categoryId: number | null;
  }>;
};

/** commit トランザクション内で Receipt を作成（#98-4 tx 渡し） */
export async function createReceiptInTx(tx: PrismaTx, input: ReceiptCreateWithItemsInput) {
  return tx.receipt.create({
    data: {
      memberId: input.memberId,
      familyGroupId: input.familyGroupId,
      storeName: input.storeName,
      date: input.date,
      totalAmount: input.totalAmount,
      taxAmount: input.taxAmount,
      imagePath: input.imagePath,
      items: { create: input.items },
      rawText: input.rawText,
    },
    select: { id: true },
  });
}

export async function linkApiUsageLogToReceiptInTx(
  tx: PrismaTx,
  usageLogId: number,
  receiptId: number
) {
  return tx.apiUsageLog.update({
    where: { id: usageLogId },
    data: { receiptId },
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

export async function updateReceiptInTx(
  tx: PrismaTx,
  receiptId: number,
  data: { date?: Date; storeName?: string; totalAmount?: number }
) {
  return tx.receipt.update({
    where: { id: receiptId },
    data: {
      date: data.date,
      storeName: data.storeName,
      totalAmount: data.totalAmount,
    },
  });
}

export async function updateReceiptStoreNamesInTx(
  tx: PrismaTx,
  familyGroupId: number,
  sourceStoreName: string,
  targetStoreName: string
) {
  return tx.receipt.updateMany({
    where: { storeName: sourceStoreName, familyGroupId },
    data: { storeName: targetStoreName },
  });
}

export type ItemCreateInput = {
  receiptId: number;
  name: string;
  price: number;
  quantity: number;
  categoryId: number | null;
};

export async function deleteItemsByReceiptIdInTx(tx: PrismaTx, receiptId: number) {
  return tx.item.deleteMany({ where: { receiptId } });
}

export async function createItemsInTx(tx: PrismaTx, items: ItemCreateInput[]) {
  if (items.length === 0) return;
  return tx.item.createMany({ data: items });
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

export async function updateItemCategoryInTx(
  tx: PrismaTx,
  itemId: number,
  categoryId: number | null
) {
  return tx.item.update({
    where: { id: itemId },
    data: { categoryId },
    include: { category: true },
  });
}

export async function deleteItemSplitsInTx(tx: PrismaTx, itemId: number) {
  return tx.itemSplit.deleteMany({ where: { itemId } });
}

export async function createItemSplitsInTx(
  tx: PrismaTx,
  splits: Array<{ itemId: number; familyMemberId: number; amount: number }>
) {
  if (splits.length === 0) return;
  return tx.itemSplit.createMany({ data: splits });
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

/** 月別合計（raw SQL） */
export async function queryMonthlyReceiptTotal(familyGroupId: number, month: string) {
  const totalRes = await prisma.$queryRaw<{ total: number | null }[]>`
    SELECT SUM("totalAmount")::double precision as total
    FROM "Receipt"
    WHERE "familyGroupId" = ${familyGroupId}
    AND TO_CHAR(date, 'YYYY-MM') = ${month}
  `;
  return totalRes[0]?.total || 0;
}

export async function queryMonthlyCategoryStats(familyGroupId: number, month: string) {
  return prisma.$queryRaw<
    { categoryId: number | null; categoryName: string | null; color: string | null; totalAmount: number }[]
  >`
    SELECT 
      c.id as "categoryId",
      c.name as "categoryName",
      c.color as "color",
      SUM(i.price * i.quantity)::double precision as "totalAmount"
    FROM "Item" i
    JOIN "Receipt" r ON i."receiptId" = r.id
    LEFT JOIN "Category" c ON i."categoryId" = c.id
    WHERE r."familyGroupId" = ${familyGroupId}
    AND TO_CHAR(r.date, 'YYYY-MM') = ${month}
    GROUP BY c.id, c.name, c.color
    ORDER BY "totalAmount" DESC
  `;
}

export async function findLatestReceiptInMonth(familyGroupId: number, month: string) {
  return prisma.receipt.findFirst({
    where: {
      familyGroupId,
      date: {
        gte: new Date(`${month}-01`),
        lt: new Date(new Date(`${month}-01`).setMonth(new Date(`${month}-01`).getMonth() + 1)),
      },
    },
    orderBy: { date: 'desc' },
    include: receiptWithItemsCategory,
  });
}

export async function queryReceiptTrend(familyGroupId: number, limit = 6) {
  return prisma.$queryRaw<{ period: string; total: number }[]>`
    SELECT 
      TO_CHAR(date, 'YYYY-MM') as period, 
      SUM("totalAmount")::double precision as total 
    FROM "Receipt" 
    WHERE "familyGroupId" = ${familyGroupId} 
    GROUP BY period 
    ORDER BY period DESC 
    LIMIT ${limit}
  `;
}

export async function queryParetoByCategory(familyGroupId: number, month: string) {
  return prisma.$queryRaw<{ name: string; amount: number }[]>`
    SELECT 
      COALESCE(c.name, '未分類') as name,
      SUM(i.price * i.quantity)::double precision as amount
    FROM "Item" i
    JOIN "Receipt" r ON i."receiptId" = r.id
    LEFT JOIN "Category" c ON i."categoryId" = c.id
    WHERE r."familyGroupId" = ${familyGroupId}
    AND TO_CHAR(r.date, 'YYYY-MM') = ${month}
    GROUP BY c.name
    ORDER BY amount DESC
  `;
}
