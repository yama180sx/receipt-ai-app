import { describe, expect, it } from 'vitest';
import { deriveInitialActiveMembers } from './splitEditorInit';
import type { ReceiptForSplitEditor } from '../../types/settlement';

const members = [
  { id: 1, name: 'A' },
  { id: 2, name: 'B' },
  { id: 3, name: 'C' },
];

const baseReceipt: ReceiptForSplitEditor = {
  id: 10,
  memberId: 1,
  storeName: 'Store',
  imagePath: null,
  items: [{ id: 100, name: 'Item', price: 100, quantity: 1, splits: [] }],
};

describe('deriveInitialActiveMembers', () => {
  it('includes payer and first other when no splits exist', () => {
    const result = deriveInitialActiveMembers(members, baseReceipt);
    expect(result.map((m) => m.id)).toEqual([1, 2]);
  });

  it('includes members with existing splits', () => {
    const receipt: ReceiptForSplitEditor = {
      ...baseReceipt,
      items: [
        {
          id: 100,
          name: 'Item',
          price: 100,
          quantity: 1,
          splits: [{ familyMemberId: 3, amount: 50 }],
        },
      ],
    };
    const result = deriveInitialActiveMembers(members, receipt);
    expect(result.map((m) => m.id)).toEqual([1, 3]);
  });

  it('uses first available member when payer is unknown', () => {
    const receipt = { ...baseReceipt, memberId: 99 };
    const result = deriveInitialActiveMembers(members, receipt);
    expect(result.map((m) => m.id)).toEqual([1]);
  });
});
