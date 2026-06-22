import type {
  AdvancedStatsData,
  AdvancedStatsViewModel,
  CategoryStatRow,
  MonthlyStatsData,
  MonthlyStatsViewModel,
  MonthlyStatItem,
  StatsCategoryOption,
  TrendStatItem,
  ParetoStatItem,
} from '../types/stats';
import type { Category, ReceiptDetail } from '../api/generated';

type LegacyMonthlyStatsRow = {
  month?: string;
  total?: number | string;
  totalAmount?: number | string;
  prevTotal?: number | string;
  diffAmount?: number | string;
  diffPercentage?: number | string;
  stats?: CategoryStatRow[];
  latestReceipt?: ReceiptDetail | null;
};

function toNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function mapStatRow(row: CategoryStatRow): MonthlyStatItem {
  return {
    categoryId: row.categoryId ?? null,
    categoryName: row.categoryName ?? '未分類',
    totalAmount: toNumber(row.totalAmount),
    color: row.color ?? '',
  };
}

function mapMonthlyStatsDto(dto: MonthlyStatsData | LegacyMonthlyStatsRow): MonthlyStatsViewModel {
  return {
    month: dto.month ?? '',
    totalAmount: toNumber('totalAmount' in dto && dto.totalAmount != null ? dto.totalAmount : dto.total),
    prevTotal: toNumber(dto.prevTotal),
    diffAmount: toNumber(dto.diffAmount),
    diffPercentage: toNumber(dto.diffPercentage),
    stats: (dto.stats ?? []).map(mapStatRow),
    latestReceipt: dto.latestReceipt ?? null,
  };
}

/**
 * 月次統計 API レスポンスを ViewModel に正規化する。
 * 旧 API（配列 + `total` フィールド）との互換をここで吸収する。
 */
export function mapMonthlyStatsResponse(
  raw: MonthlyStatsData | MonthlyStatsData[] | LegacyMonthlyStatsRow | LegacyMonthlyStatsRow[] | null | undefined,
  selectedMonth: string
): MonthlyStatsViewModel | null {
  if (raw == null) return null;

  if (Array.isArray(raw)) {
    const target = raw.find((item) => item.month === selectedMonth) ?? raw[0];
    if (!target) {
      return {
        month: selectedMonth,
        totalAmount: 0,
        prevTotal: 0,
        diffAmount: 0,
        diffPercentage: 0,
        stats: [],
        latestReceipt: null,
      };
    }
    return {
      ...mapMonthlyStatsDto(target),
      month: target.month ?? selectedMonth,
      prevTotal: 0,
      diffAmount: 0,
      diffPercentage: 0,
    };
  }

  return mapMonthlyStatsDto(raw);
}

export function mapAdvancedStatsResponse(
  raw: AdvancedStatsData | null | undefined
): AdvancedStatsViewModel | null {
  if (!raw) return null;

  const trend: TrendStatItem[] = (raw.trend ?? []).map((row) => ({
    period: row.period,
    total: toNumber(row.total),
    prevTotal: row.prev_total == null ? null : toNumber(row.prev_total),
  }));

  const pareto: ParetoStatItem[] = (raw.pareto ?? []).map((row) => ({
    name: row.name,
    amount: toNumber(row.amount),
    ratio: toNumber(row.ratio),
    cumulativeRatio: toNumber(row.cumulative_ratio),
  }));

  return { trend, pareto };
}

export function mapCategoryList(categories: Category[]): StatsCategoryOption[] {
  return categories.map((category) => ({
    id: category.id,
    name: category.name,
    color: category.color,
  }));
}
