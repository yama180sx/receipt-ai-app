import { describe, expect, it } from 'vitest';
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

  it('returns empty array when no splits', () => {
    expect(allocateItemSplits(100, [])).toEqual([]);
  });
});
