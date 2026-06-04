import { describe, expect, it } from 'vitest';
import { AppError } from './appError';
import { allocateItemSplits } from './itemSplitAllocation';

describe('allocateItemSplits', () => {
  it('puts remainder on the last member for ratio splits', () => {
    const result = allocateItemSplits(100, [
      { familyMemberId: 1, ratio: 0.33 },
      { familyMemberId: 2, ratio: 0.33 },
      { familyMemberId: 3, ratio: 0.34 },
    ]);

    expect(result.map((s) => s.amount)).toEqual([33, 33, 34]);
    expect(result.reduce((sum, s) => sum + s.amount, 0)).toBe(100);
  });

  it('allocates by explicit amounts and remainder on last member', () => {
    const result = allocateItemSplits(100, [
      { familyMemberId: 1, amount: 40 },
      { familyMemberId: 2, amount: 35 },
      { familyMemberId: 3 },
    ]);

    expect(result).toEqual([
      { familyMemberId: 1, amount: 40 },
      { familyMemberId: 2, amount: 35 },
      { familyMemberId: 3, amount: 25 },
    ]);
  });

  it('handles two-member equal ratio with odd total', () => {
    const result = allocateItemSplits(101, [
      { familyMemberId: 10, ratio: 0.5 },
      { familyMemberId: 20, ratio: 0.5 },
    ]);

    expect(result.map((s) => s.amount)).toEqual([51, 50]);
  });

  it('returns empty array when no splits', () => {
    expect(allocateItemSplits(100, [])).toEqual([]);
  });

  it('accepts zero total with zero splits on each member', () => {
    const result = allocateItemSplits(0, [{ familyMemberId: 1, ratio: 1 }]);
    expect(result).toEqual([{ familyMemberId: 1, amount: 0 }]);
  });

  it('throws when total is negative', () => {
    expect(() => allocateItemSplits(-1, [{ familyMemberId: 1, ratio: 1 }])).toThrow(
      AppError
    );
  });

  it('throws on duplicate familyMemberId', () => {
    expect(() =>
      allocateItemSplits(100, [
        { familyMemberId: 1, ratio: 0.5 },
        { familyMemberId: 1, ratio: 0.5 },
      ])
    ).toThrow(AppError);
  });

  it('throws on invalid familyMemberId', () => {
    expect(() =>
      allocateItemSplits(100, [{ familyMemberId: 0, ratio: 1 }])
    ).toThrow(AppError);
  });

  it('throws when non-last split lacks ratio and amount', () => {
    expect(() =>
      allocateItemSplits(100, [
        { familyMemberId: 1 },
        { familyMemberId: 2, ratio: 1 },
      ])
    ).toThrow(AppError);
  });

  it('throws when explicit amounts exceed total before last member', () => {
    expect(() =>
      allocateItemSplits(100, [
        { familyMemberId: 1, amount: 60 },
        { familyMemberId: 2, amount: 50 },
        { familyMemberId: 3 },
      ])
    ).toThrow(AppError);
  });
});
