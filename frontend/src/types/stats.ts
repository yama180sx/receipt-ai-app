import type { Category, ReceiptDetail } from '../api/generated';

/** 画面表示用カテゴリ（セレクト等） */
export type StatsCategoryOption = Pick<Category, 'id' | 'name' | 'color'>;

/** 月次カテゴリ別統計行（ViewModel） */
export type MonthlyStatItem = {
  categoryId: number | null;
  categoryName: string;
  totalAmount: number;
  color: string;
};

/** 月次統計画面 ViewModel */
export type MonthlyStatsViewModel = {
  month: string;
  totalAmount: number;
  prevTotal: number;
  diffAmount: number;
  diffPercentage: number;
  stats: MonthlyStatItem[];
  latestReceipt: ReceiptDetail | null;
};

/** 月次推移行（ViewModel） */
export type TrendStatItem = {
  period: string;
  total: number;
  prevTotal: number | null;
};

/** パレート分析行（ViewModel） */
export type ParetoStatItem = {
  name: string;
  amount: number;
  ratio: number;
  cumulativeRatio: number;
};

/** 高度統計 ViewModel */
export type AdvancedStatsViewModel = {
  trend: TrendStatItem[];
  pareto: ParetoStatItem[];
};

/** OpenAPI DTO 再 export（Mapper 入力用） */
export type {
  AdvancedStatsData,
  CategoryStatRow,
  MonthlyStatsData,
  ParetoRow,
  TrendRow,
} from '../api/generated';
