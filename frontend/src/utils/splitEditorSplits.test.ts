import { describe, expect, it } from 'vitest';
import { buildItemSplitSavePayload, calcItemTotal } from './splitEditorSplits';

describe('splitEditorSplits', () => {
  it('calculates item total with rounding', () => {
    expect(calcItemTotal({ price: 99.5, quantity: 2 })).toBe(199);
  });

  it('places remainder member at end of payload', () => {
    const payload = buildItemSplitSavePayload(
      [{ id: 1 }, { id: 2 }, { id: 3 }],
      { 1: 33, 2: 33, 3: 34 },
      1
    );

    expect(payload.map((p) => p.familyMemberId)).toEqual([2, 3, 1]);
    expect(payload.map((p) => p.amount)).toEqual([33, 34, 33]);
  });
});
