import {
  findLatestReceiptInMonth,
  queryMonthlyCategoryStats,
  queryMonthlyReceiptTotal,
  queryParetoByCategory,
  queryReceiptTrend,
} from '../../repositories/receiptRepository';

/** 月別統計 */
export async function getMonthlyStats(familyGroupId: number, month: string) {
  const totalAmount = await queryMonthlyReceiptTotal(familyGroupId, month);
  const categoryStats = await queryMonthlyCategoryStats(familyGroupId, month);
  const latestReceipt = await findLatestReceiptInMonth(familyGroupId, month);

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
  const trend = await queryReceiptTrend(familyGroupId);
  const month = new Date().toISOString().slice(0, 7);
  const paretoRaw = await queryParetoByCategory(familyGroupId, month);

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
