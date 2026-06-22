import { describe, expect, it } from 'vitest';
import {
  applyRemainderToFirst,
  buildInitialSplits,
  parseNonNegativeInt,
  parsePercentInt,
  splitAmountEqually,
  sumMemberAmountsAcrossItems,
  updateItemAmount,
  updateItemPercent,
} from './splitEditorMutations';
import type { ReceiptForSplitEditor } from '../../../types/settlement';

const members = [
  { id: 1, name: 'A' },
  { id: 2, name: 'B' },
];

describe('splitEditorMutations', () => {
  it('parseNonNegativeInt strips non-digits and clamps to max', () => {
    expect(parseNonNegativeInt('12a3', 100)).toBe(100);
    expect(parseNonNegativeInt('', 50)).toBe(0);
  });

  it('parsePercentInt clamps to 100', () => {
    expect(parsePercentInt('150')).toBe(100);
  });

  it('applyRemainderToFirst assigns leftover to first member', () => {
    const result = applyRemainderToFirst(
      { 1: 0, 2: 40 },
      100,
      1,
      [1, 2]
    );
    expect(result).toEqual({ 1: 60, 2: 40 });
  });

  it('splitAmountEqually puts remainder on first member', () => {
    expect(splitAmountEqually(100, [1, 2, 3])).toEqual({
      1: 34,
      2: 33,
      3: 33,
    });
  });

  it('buildInitialSplits defaults payer to full amount when no splits', () => {
    const receipt: ReceiptForSplitEditor = {
      id: 1,
      memberId: 1,
      storeName: 'Store',
      imagePath: null,
      items: [{ id: 10, name: 'Tea', price: 100, quantity: 1, splits: [] }],
    };
    expect(buildInitialSplits(receipt, members)).toEqual({
      10: { 1: 100, 2: 0 },
    });
  });

  it('updateItemAmount recalculates remainder member', () => {
    const result = updateItemAmount(
      { 1: 100, 2: 0 },
      2,
      '30',
      100,
      1,
      [1, 2]
    );
    expect(result).toEqual({ 1: 70, 2: 30 });
  });

  it('updateItemPercent derives amount from percent', () => {
    const result = updateItemPercent(
      { 1: 100, 2: 0 },
      2,
      '25',
      100,
      1,
      [1, 2]
    );
    expect(result).toEqual({ 1: 75, 2: 25 });
  });

  it('sumMemberAmountsAcrossItems totals per member', () => {
    const receipt: ReceiptForSplitEditor = {
      id: 1,
      memberId: 1,
      storeName: 'Store',
      imagePath: null,
      items: [
        { id: 10, name: 'A', price: 50, quantity: 1, splits: [] },
        { id: 11, name: 'B', price: 50, quantity: 1, splits: [] },
      ],
    };
    const splits = {
      10: { 1: 30, 2: 20 },
      11: { 1: 40, 2: 10 },
    };
    expect(sumMemberAmountsAcrossItems(receipt.items, splits, 2)).toBe(30);
  });
});
