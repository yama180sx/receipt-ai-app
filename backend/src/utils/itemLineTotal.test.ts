import { describe, expect, it } from 'vitest';
import { calcItemLineTotal } from './itemLineTotal';

describe('calcItemLineTotal', () => {
  it('rounds price × quantity to integer yen', () => {
    expect(calcItemLineTotal(99.5, 2)).toBe(199);
  });

  it('parses string price and quantity', () => {
    expect(calcItemLineTotal('108', '3')).toBe(324);
  });

  it('defaults quantity to 1', () => {
    expect(calcItemLineTotal(498)).toBe(498);
  });

  it('treats invalid quantity as 1', () => {
    expect(calcItemLineTotal(100, 'abc')).toBe(100);
  });

  it('returns 0 for zero price', () => {
    expect(calcItemLineTotal(0, 5)).toBe(0);
  });
});
