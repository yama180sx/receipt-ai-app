/** YYYY-MM → 「2026年05月」形式（月選択 AppSelect 用） */
export const formatMonthLabel = (yearMonth: string): string => {
  const [y, m] = yearMonth.split('-');
  return `${y}年${m}月`;
};

export const toMonthSelectOptions = (months: string[]) =>
  months.map((m) => ({ label: formatMonthLabel(m), value: m }));
