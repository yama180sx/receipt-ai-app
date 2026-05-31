/** YYYY-MM（ローカル TZ。receipt.date の保存方式と揃える） */
const YEAR_MONTH_RE = /^(\d{4})-(\d{1,2})$/;

export function getCurrentYearMonthLocal(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function normalizeYearMonth(input: string | undefined | null): string | null {
  if (!input || typeof input !== 'string') return null;
  const trimmed = input.trim();
  const match = trimmed.match(YEAR_MONTH_RE);
  if (!match) return null;
  const y = match[1];
  const m = String(parseInt(match[2], 10)).padStart(2, '0');
  return `${y}-${m}`;
}

/** 指定月の [start, end) をローカル日付で返す（parseSafeDate と同系） */
export function getLocalMonthDateRange(yearMonth: string): { start: Date; end: Date } {
  const normalized = normalizeYearMonth(yearMonth);
  if (!normalized) {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    return { start: new Date(y, m, 1, 0, 0, 0, 0), end: new Date(y, m + 1, 1, 0, 0, 0, 0) };
  }
  const [yStr, mStr] = normalized.split('-');
  const y = parseInt(yStr, 10);
  const m = parseInt(mStr, 10) - 1;
  return {
    start: new Date(y, m, 1, 0, 0, 0, 0),
    end: new Date(y, m + 1, 1, 0, 0, 0, 0),
  };
}
