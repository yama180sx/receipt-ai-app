import { describe, expect, it } from 'vitest';
import { getCleanText } from './normalizer';

describe('getCleanText', () => {
  it('normalizes Unicode form, case, whitespace, and control characters', () => {
    expect(getCleanText('  ＭＩＬＫ\n\t\u0000  １Ｌ  ')).toBe('milk 1l');
  });

  it('returns an empty string for absent input', () => {
    expect(getCleanText(null)).toBe('');
    expect(getCleanText(undefined)).toBe('');
  });
});
