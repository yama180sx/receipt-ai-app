import { describe, expect, it } from 'vitest';
import { computeSettlementMemberSummaries } from './settlementAggregation';
import { buildSettlementReceiptInputsFromItems } from './settlementService';

const members = [
  { id: 1, name: 'Alice' },
  { id: 2, name: 'Bob' },
];

describe('buildSettlementReceiptInputsFromItems', () => {
  it('groups items by receipt and preserves splits', () => {
    const receipts = buildSettlementReceiptInputsFromItems([
      {
        receiptId: 10,
        memberId: 1,
        price: 100,
        quantity: 1,
        splits: [],
      },
      {
        receiptId: 10,
        memberId: 1,
        price: 50,
        quantity: 2,
        splits: [{ familyMemberId: 2, amount: 100 }],
      },
      {
        receiptId: 20,
        memberId: 2,
        price: 200,
        quantity: 1,
        splits: [],
      },
    ]);

    expect(receipts).toHaveLength(2);
    expect(receipts[0]).toEqual({
      memberId: 1,
      items: [
        { price: 100, quantity: 1, splits: [] },
        { price: 50, quantity: 2, splits: [{ familyMemberId: 2, amount: 100 }] },
      ],
    });
    expect(receipts[1]).toEqual({
      memberId: 2,
      items: [{ price: 200, quantity: 1, splits: [] }],
    });
  });

  it('produces the same aggregation as receipt-centric mapping', () => {
    const legacyReceipts = [
      {
        memberId: 1,
        items: [
          { price: 100, quantity: 1, splits: [] },
          {
            price: 50,
            quantity: 2,
            splits: [
              { familyMemberId: 1, amount: 40 },
              { familyMemberId: 2, amount: 60 },
            ],
          },
        ],
      },
      {
        memberId: 2,
        items: [{ price: 200, quantity: 1, splits: [] }],
      },
    ];

    const itemRows = [
      {
        receiptId: 10,
        memberId: 1,
        price: 100,
        quantity: 1,
        splits: [] as { familyMemberId: number; amount: number }[],
      },
      {
        receiptId: 10,
        memberId: 1,
        price: 50,
        quantity: 2,
        splits: [
          { familyMemberId: 1, amount: 40 },
          { familyMemberId: 2, amount: 60 },
        ],
      },
      {
        receiptId: 20,
        memberId: 2,
        price: 200,
        quantity: 1,
        splits: [] as { familyMemberId: number; amount: number }[],
      },
    ];

    const optimizedReceipts = buildSettlementReceiptInputsFromItems(itemRows);
    const transfers = [{ fromMemberId: 2, toMemberId: 1, amount: 60 }];

    expect(
      computeSettlementMemberSummaries(members, optimizedReceipts, transfers)
    ).toEqual(computeSettlementMemberSummaries(members, legacyReceipts, transfers));
  });
});
