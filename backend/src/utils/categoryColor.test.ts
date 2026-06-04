import { describe, expect, it } from 'vitest';
import { CATEGORY_COLOR_PALETTE, pickNextCategoryColor } from './categoryColor';

describe('pickNextCategoryColor', () => {
  it('returns first palette color when none are used', () => {
    expect(pickNextCategoryColor([])).toBe(CATEGORY_COLOR_PALETTE[0]);
  });

  it('skips colors already used (case-insensitive)', () => {
    const used = CATEGORY_COLOR_PALETTE.slice(0, 3).map((c) => c.toUpperCase());
    expect(pickNextCategoryColor(used)).toBe(CATEGORY_COLOR_PALETTE[3]);
  });

  it('ignores empty and null entries', () => {
    expect(pickNextCategoryColor([null, '', '   '])).toBe(CATEGORY_COLOR_PALETTE[0]);
  });

  it('generates fallback hex when palette is exhausted', () => {
    const allUsed = [...CATEGORY_COLOR_PALETTE];
    const fallback = pickNextCategoryColor(allUsed);

    expect(fallback).toMatch(/^#[0-9a-f]{6}$/);
    expect(allUsed.map((c) => c.toLowerCase())).not.toContain(fallback.toLowerCase());
  });
});
