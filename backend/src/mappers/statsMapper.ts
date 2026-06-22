import type {
  AdvancedStatsData,
  CategoryStatRow,
  MonthlyStatsData,
} from '../types/apiSchemas';
import { mapReceiptToDetail, type ReceiptWithItemsCategory } from './receiptMapper';

export type MonthlyCategoryStatDomain = {
  categoryId: number | null;
  categoryName: string | null;
  color: string | null;
  totalAmount: number;
};

export type MonthlyStatsDomain = {
  month: string;
  totalAmount: number;
  stats: MonthlyCategoryStatDomain[];
  latestReceipt: ReceiptWithItemsCategory | null;
};

export type AdvancedStatsDomain = {
  trend: AdvancedStatsData['trend'];
  pareto: AdvancedStatsData['pareto'];
};

export function mapCategoryStatRows(rows: MonthlyCategoryStatDomain[]): CategoryStatRow[] {
  return rows.map((row) => ({
    categoryId: row.categoryId,
    categoryName: row.categoryName || '未分類',
    totalAmount: row.totalAmount,
    color: row.color,
  }));
}

export function mapMonthlyStatsToApi(domain: MonthlyStatsDomain): MonthlyStatsData {
  return {
    month: domain.month,
    totalAmount: domain.totalAmount,
    stats: mapCategoryStatRows(domain.stats),
    latestReceipt: mapReceiptToDetail(domain.latestReceipt),
  };
}

export function mapAdvancedStatsToApi(domain: AdvancedStatsDomain): AdvancedStatsData {
  return domain;
}
