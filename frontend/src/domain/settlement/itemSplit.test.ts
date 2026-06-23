import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { buildItemSplitSavePayload, calcItemTotal } from './itemSplit';

type ItemLineTotalVector = {
  id: string;
  price: unknown;
  quantity?: unknown;
  expected: number;
};

type ItemLineTotalFixture = {
  vectors: ItemLineTotalVector[];
};

const fixturePath = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../../docs/testing/fixtures/itemLineTotal-vectors.json'
);
const fixture = JSON.parse(readFileSync(fixturePath, 'utf-8')) as ItemLineTotalFixture;

describe('calcItemTotal contract (itemLineTotal-vectors.json)', () => {
  it.each(fixture.vectors)('$id', ({ price, quantity, expected }) => {
    const item =
      quantity === undefined ? { price } : { price, quantity };
    expect(calcItemTotal(item)).toBe(expected);
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
