import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getCurrentYearMonthLocal,
  getLocalMonthDateRange,
  normalizeYearMonth,
} from './yearMonth';

describe('normalizeYearMonth', () => {
  it('normalizes single-digit month', () => {
    expect(normalizeYearMonth('2026-5')).toBe('2026-05');
  });

  it('trims whitespace', () => {
    expect(normalizeYearMonth('  2026-12  ')).toBe('2026-12');
  });

  it('returns null for invalid format', () => {
    expect(normalizeYearMonth('2026/05')).toBeNull();
    expect(normalizeYearMonth('')).toBeNull();
    expect(normalizeYearMonth(null)).toBeNull();
  });
});

describe('getLocalMonthDateRange', () => {
  it('returns local midnight boundaries for the given month', () => {
    const { start, end } = getLocalMonthDateRange('2026-05');

    expect(start.getFullYear()).toBe(2026);
    expect(start.getMonth()).toBe(4);
    expect(start.getDate()).toBe(1);
    expect(start.getHours()).toBe(0);

    expect(end.getFullYear()).toBe(2026);
    expect(end.getMonth()).toBe(5);
    expect(end.getDate()).toBe(1);
  });

  it('falls back to current month when input is invalid', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 15, 12, 0, 0)); // 2026-03-15 local

    const { start, end } = getLocalMonthDateRange('invalid');

    expect(start.getFullYear()).toBe(2026);
    expect(start.getMonth()).toBe(2);
    expect(end.getMonth()).toBe(3);

    vi.useRealTimers();
  });
});

describe('getCurrentYearMonthLocal', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns YYYY-MM in local timezone', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 31, 23, 30, 0)); // still January locally

    expect(getCurrentYearMonthLocal()).toBe('2026-01');
  });
});
