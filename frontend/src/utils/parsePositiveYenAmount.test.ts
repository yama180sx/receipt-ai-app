import { describe, expect, it } from 'vitest';
import { hasNegativeAmountSign, parsePositiveYenAmount } from './parsePositiveYenAmount';

describe('hasNegativeAmountSign', () => {
  it('detects half-width and full-width minus signs', () => {
    expect(hasNegativeAmountSign('-1000')).toBe(true);
    expect(hasNegativeAmountSign('－1000')).toBe(true);
    expect(hasNegativeAmountSign('1000')).toBe(false);
  });
});

describe('parsePositiveYenAmount', () => {
  it('parses positive integer yen from formatted input', () => {
    expect(parsePositiveYenAmount('5,000円')).toBe(5000);
  });

  it('rejects negative-looking input without extracting digits', () => {
    expect(parsePositiveYenAmount('-5000')).toBeNull();
    expect(parsePositiveYenAmount('－5000')).toBeNull();
  });

  it('rejects zero and empty input', () => {
    expect(parsePositiveYenAmount('0')).toBeNull();
    expect(parsePositiveYenAmount('')).toBeNull();
    expect(parsePositiveYenAmount('   ')).toBeNull();
  });

  it('rejects non-numeric input', () => {
    expect(parsePositiveYenAmount('abc')).toBeNull();
  });
});
