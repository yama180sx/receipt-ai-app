import { describe, expect, it } from 'vitest';
import {
  aggregateReceiptsIntoStats,
  aggregateTransfersIntoStats,
  computeSettlementMemberSummaries,
  finalizeMemberStats,
  initMemberStats,
} from './settlementAggregation';

const members = [
  { id: 1, name: 'Alice' },
  { id: 2, name: 'Bob' },
];

describe('settlementAggregation', () => {
  it('assigns implicit default owed to payer when item has no splits', () => {
    const stats = initMemberStats(members);
    aggregateReceiptsIntoStats(stats, [
      {
        memberId: 1,
        items: [{ price: 100, quantity: 1, splits: [] }],
      },
    ]);

    const [alice] = finalizeMemberStats(stats);
    expect(alice.totalPaid).toBe(100);
    expect(alice.totalOwed).toBe(100);
    expect(alice.baseBalance).toBe(0);
  });

  it('distributes owed by explicit splits', () => {
    const stats = initMemberStats(members);
    aggregateReceiptsIntoStats(stats, [
      {
        memberId: 1,
        items: [
          {
            price: 100,
            quantity: 1,
            splits: [
              { familyMemberId: 1, amount: 40 },
              { familyMemberId: 2, amount: 60 },
            ],
          },
        ],
      },
    ]);

    const result = finalizeMemberStats(stats);
    const alice = result.find((m) => m.memberId === 1)!;
    const bob = result.find((m) => m.memberId === 2)!;

    expect(alice.totalPaid).toBe(100);
    expect(alice.totalOwed).toBe(40);
    expect(alice.baseBalance).toBe(60);
    expect(bob.totalPaid).toBe(0);
    expect(bob.totalOwed).toBe(60);
    expect(bob.baseBalance).toBe(-60);
  });

  it('applies transfers to balance per domain-model §5', () => {
    const stats = initMemberStats(members);
    aggregateReceiptsIntoStats(stats, [
      {
        memberId: 1,
        items: [{ price: 100, quantity: 1, splits: [{ familyMemberId: 2, amount: 100 }] }],
      },
    ]);
    aggregateTransfersIntoStats(stats, [{ fromMemberId: 2, toMemberId: 1, amount: 100 }]);

    const result = finalizeMemberStats(stats);
    const alice = result.find((m) => m.memberId === 1)!;
    const bob = result.find((m) => m.memberId === 2)!;

    expect(alice.baseBalance).toBe(100);
    expect(alice.transferredIn).toBe(100);
    expect(alice.balance).toBe(0);
    expect(bob.baseBalance).toBe(-100);
    expect(bob.transferredOut).toBe(100);
    expect(bob.balance).toBe(0);
  });

  it('computeSettlementMemberSummaries integrates all steps', () => {
    const result = computeSettlementMemberSummaries(
      members,
      [
        {
          memberId: 1,
          items: [{ price: 50, quantity: 2, splits: [] }],
        },
      ],
      []
    );

    expect(result).toHaveLength(2);
    expect(result.find((m) => m.memberId === 1)).toMatchObject({
      totalPaid: 100,
      totalOwed: 100,
      balance: 0,
    });
  });
});
