import { prisma } from '../../utils/prismaClient';
import { receiptWithItemsCategory } from './receiptIncludes';

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
