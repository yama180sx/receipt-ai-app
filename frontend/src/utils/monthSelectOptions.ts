import { useMemo } from 'react';

/** ローカルタイムゾーンで YYYY-MM（toISOString は UTC で月がずれる・重複する） */
export const formatYearMonthLocal = (date: Date): string => {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  return `${y}-${String(m).padStart(2, '0')}`;
};

export const getCurrentYearMonth = (): string => formatYearMonthLocal(new Date());

/** 直近 count ヶ月分（重複なし・古い順ではなく新しい順） */
export const getRecentYearMonths = (count: number): string[] => {
  const seen = new Set<string>();
  const result: string[] = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const ym = formatYearMonthLocal(d);
    if (!seen.has(ym)) {
      seen.add(ym);
      result.push(ym);
    }
  }
  return result;
};

/** YYYY-MM → 「2026年05月」（ワイド画面・Web 向け） */
export const formatMonthLabel = (yearMonth: string): string => {
  const [y, m] = yearMonth.split('-');
  const monthNum = parseInt(m, 10);
  return `${y}年${monthNum}月`;
};

/** YYYY-MM → 「2026/5」（狭い Picker 向け・横スクロール切れ防止） */
export const formatMonthLabelCompact = (yearMonth: string): string => {
  const [y, m] = yearMonth.split('-');
  const monthNum = parseInt(m, 10);
  return `${y}/${monthNum}`;
};

export type MonthLabelStyle = 'full' | 'compact';

export const toMonthSelectOptions = (
  months: string[],
  labelStyle: MonthLabelStyle = 'full'
) =>
  months.map((m) => ({
    label: labelStyle === 'compact' ? formatMonthLabelCompact(m) : formatMonthLabel(m),
    value: m,
  }));

/** 狭い画面では compact ラベル（例: 2026/5） */
export function useMonthSelectOptions(months: string[], isWide: boolean) {
  return useMemo(
    () => toMonthSelectOptions(months, isWide ? 'full' : 'compact'),
    [months, isWide]
  );
}
