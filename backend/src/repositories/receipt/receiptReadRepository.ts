import { Prisma, ProductTypeStatus } from '@prisma/client';
import { prisma } from '../../utils/prismaClient';
import type { PrismaTx } from '../../utils/prismaTransaction';
import { AppError } from '../../utils/appError';
import { getLocalMonthDateRange } from '../../utils/yearMonth';
import type { ReceiptCursorPosition } from '../../utils/receiptPaginationCursor';
import {
  receiptWithItemsCategory,
  receiptWithItemsCategorySplits,
} from './receiptIncludes';

export type ListReceiptsParams = {
  familyGroupId: number;
  memberId?: number;
  month?: string;
  query?: string;
  limit: number;
  cursor?: ReceiptCursorPosition;
};

function buildListWhere(params: ListReceiptsParams): Prisma.ReceiptWhereInput {
  const { familyGroupId, memberId, month } = params;
  const where: Prisma.ReceiptWhereInput = { familyGroupId };

  if (memberId !== undefined) {
    where.memberId = memberId;
  }

  if (month) {
    const { start, end } = getLocalMonthDateRange(month);
    where.date = { gte: start, lt: end };
  }

  if (params.cursor) {
    where.AND = [
      {
        OR: [
          { date: { lt: params.cursor.date } },
          { date: params.cursor.date, id: { lt: params.cursor.id } },
        ],
      },
    ];
  }

  return where;
}

/**
 * 店舗名・明細名を pg_trgm で検索する。検索候補は必ず世帯で絞り込み、
 * 呼び出し側の月・メンバー条件は通常の Prisma where と合成する。
 */
async function findReceiptIdsByFuzzyQuery(params: ListReceiptsParams): Promise<number[]> {
  const { familyGroupId, memberId, month, query, cursor, limit } = params;
  if (!query) return [];

  const monthClause = month
    ? (() => {
      const { start, end } = getLocalMonthDateRange(month);
      return Prisma.sql`AND receipt.date >= ${start} AND receipt.date < ${end}`;
    })()
    : Prisma.empty;
  const memberClause = memberId !== undefined
    ? Prisma.sql`AND receipt."memberId" = ${memberId}`
    : Prisma.empty;
  const cursorClause = cursor
    ? Prisma.sql`AND (receipt.date < ${cursor.date} OR (receipt.date = ${cursor.date} AND receipt.id < ${cursor.id}))`
    : Prisma.empty;

  const rows = await prisma.$queryRaw<{ id: number }[]>`
    SELECT receipt.id
    FROM "Receipt" AS receipt
    WHERE receipt."familyGroupId" = ${familyGroupId}
      ${memberClause}
      ${monthClause}
      ${cursorClause}
      AND (
        receipt."normalizedStoreName" % ${query}
        OR EXISTS (
          SELECT 1
          FROM "Item" AS item
          WHERE item."receiptId" = receipt.id
            AND item."normalizedName" % ${query}
        )
      )
    ORDER BY receipt.date DESC, receipt.id DESC
    LIMIT ${limit + 1}
  `;

  return rows.map((row) => row.id);
}

export async function findReceipts(params: ListReceiptsParams) {
  const where = buildListWhere(params);
  if (params.query) {
    where.id = { in: await findReceiptIdsByFuzzyQuery(params) };
  }

  return prisma.receipt.findMany({
    where,
    include: receiptWithItemsCategorySplits,
    orderBy: [{ date: 'desc' }, { id: 'desc' }],
    take: params.limit + 1,
  });
}

export async function findReceiptByIdForTenant(id: number, familyGroupId: number) {
  return prisma.receipt.findFirst({
    where: { id, familyGroupId },
    include: receiptWithItemsCategorySplits,
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

const productClassificationAiTargetInclude = {
  receipt: { select: { id: true, familyGroupId: true, storeName: true } },
  productClassificationCandidates: {
    include: { productType: { include: { standardCategory: true } } },
    orderBy: { rank: 'asc' },
  },
} satisfies Prisma.ItemInclude;

/** AI分類を送信できる、候補を持つ要確認明細だけを世帯スコープで取得する。 */
export async function findProductClassificationAiTargets(
  itemIds: number[],
  familyGroupId: number
) {
  if (itemIds.length === 0) return [];
  return prisma.item.findMany({
    where: {
      id: { in: itemIds },
      productTypeStatus: ProductTypeStatus.NEEDS_REVIEW,
      receipt: { familyGroupId },
      productClassificationCandidates: { some: {} },
    },
    include: productClassificationAiTargetInclude,
    orderBy: { id: 'asc' },
  });
}

/** AI応答の反映直前に対象明細を再確認する。 */
export async function findProductClassificationAiTargetInTx(
  tx: PrismaTx,
  itemId: number,
  familyGroupId: number
) {
  return tx.item.findFirst({
    where: {
      id: itemId,
      productTypeStatus: ProductTypeStatus.NEEDS_REVIEW,
      receipt: { familyGroupId },
      productClassificationCandidates: { some: {} },
    },
    include: productClassificationAiTargetInclude,
  });
}

export async function findItemById(itemId: number) {
  return prisma.item.findUnique({
    where: { id: itemId },
    include: { category: true, productType: true },
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
