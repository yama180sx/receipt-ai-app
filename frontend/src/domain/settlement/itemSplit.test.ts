import { describe, expect, it } from 'vitest';
import { buildItemSplitSavePayload, calcItemTotal } from './itemSplit';

describe('calcItemTotal', () => {
  it('matches backend calcItemLineTotal rounding', () => {
    expect(calcItemTotal({ price: 99.5, quantity: 2 })).toBe(199);
  });

  it('defaults quantity to 1', () => {
    expect(calcItemTotal({ price: 108 })).toBe(108);
  });

  it('handles string-like values from API', () => {
    expect(calcItemTotal({ price: '250', quantity: '2' })).toBe(500);
  });
});

describe('buildItemSplitSavePayload', () => {
  it('places remainder member at end for backend last-element rule', () => {
    const payload = buildItemSplitSavePayload(
      [{ id: 1 }, { id: 2 }, { id: 3 }],
      { 1: 33, 2: 33, 3: 34 },
      1
    );

    expect(payload.map((p) => p.familyMemberId)).toEqual([2, 3, 1]);
    expect(payload.map((p) => p.amount)).toEqual([33, 34, 33]);
  });

  it('returns empty array when no active members', () => {
    expect(buildItemSplitSavePayload([], {}, 1)).toEqual([]);
  });

  it('keeps member order when remainder id is not found', () => {
    const payload = buildItemSplitSavePayload(
      [{ id: 1 }, { id: 2 }],
      { 1: 60, 2: 40 },
      99
    );

    expect(payload.map((p) => p.familyMemberId)).toEqual([1, 2]);
    expect(payload.map((p) => p.amount)).toEqual([60, 40]);
  });

  it('defaults missing amounts to zero', () => {
    const payload = buildItemSplitSavePayload([{ id: 1 }, { id: 2 }], {}, 2);

    expect(payload).toEqual([
      { familyMemberId: 1, amount: 0 },
      { familyMemberId: 2, amount: 0 },
    ]);
  });
});
