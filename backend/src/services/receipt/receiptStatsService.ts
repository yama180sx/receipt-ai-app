import { prisma } from '../../utils/prismaClient';

/** 月別統計 */
export async function getMonthlyStats(familyGroupId: number, month: string) {
  const totalRes = await prisma.$queryRaw<{ total: number | null }[]>`
    SELECT SUM("totalAmount")::double precision as total
    FROM "Receipt"
    WHERE "familyGroupId" = ${familyGroupId}
    AND TO_CHAR(date, 'YYYY-MM') = ${month}
  `;
  const totalAmount = totalRes[0]?.total || 0;

  const categoryStats = await prisma.$queryRaw<
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

  const latestReceipt = await prisma.receipt.findFirst({
    where: {
      familyGroupId,
      date: {
        gte: new Date(`${month}-01`),
        lt: new Date(new Date(`${month}-01`).setMonth(new Date(`${month}-01`).getMonth() + 1)),
      },
    },
    orderBy: { date: 'desc' },
    include: { items: { include: { category: true } } },
  });

  return {
    month,
    totalAmount,
    stats: categoryStats.map((s) => ({
      ...s,
      categoryName: s.categoryName || '未分類',
    })),
    latestReceipt,
  };
}

/** 高度な統計（トレンド・パレート） */
export async function getAdvancedStats(familyGroupId: number) {
  const trend = await prisma.$queryRaw<{ period: string; total: number }[]>`
    SELECT 
      TO_CHAR(date, 'YYYY-MM') as period, 
      SUM("totalAmount")::double precision as total 
    FROM "Receipt" 
    WHERE "familyGroupId" = ${familyGroupId} 
    GROUP BY period 
    ORDER BY period DESC 
    LIMIT 6
  `;

  const month = new Date().toISOString().slice(0, 7);
  const paretoRaw = await prisma.$queryRaw<{ name: string; amount: number }[]>`
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

  const total = paretoRaw.reduce((sum, item) => sum + (item.amount || 0), 0);
  let cumulative = 0;
  const pareto = paretoRaw.map((item) => {
    const ratio = total > 0 ? Math.round((item.amount / total) * 100) : 0;
    cumulative += ratio;
    return {
      ...item,
      ratio,
      cumulative_ratio: cumulative > 100 ? 100 : cumulative,
    };
  });

  return { trend, pareto };
}
