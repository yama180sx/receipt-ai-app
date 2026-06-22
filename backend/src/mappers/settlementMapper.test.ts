import { describe, expect, it } from 'vitest';
import {
  mapDeletedSettlementTransferToApi,
  mapSettlementStatusToApi,
  mapSettlementTransferToApi,
} from './settlementMapper';

describe('settlementMapper', () => {
  it('maps settlement status with ISO settledAt', () => {
    const result = mapSettlementStatusToApi({
      month: '2026-01',
      members: [
        {
          memberId: 1,
          name: '太郎',
          totalPaid: 1000,
          totalOwed: 400,
          baseBalance: 600,
          transferredOut: 100,
          transferredIn: 0,
          balance: 700,
        },
      ],
      transfers: [
        {
          id: 9,
          fromMemberId: 1,
          toMemberId: 2,
          amount: 100,
          month: '2026-01',
          settledAt: new Date('2026-01-20T12:00:00.000Z'),
        },
      ],
    });

    expect(result.month).toBe('2026-01');
    expect(result.members[0].totalPaid).toBe(1000);
    expect(result.transfers[0]).toEqual({
      id: 9,
      fromMemberId: 1,
      toMemberId: 2,
      amount: 100,
      month: '2026-01',
      settledAt: '2026-01-20T12:00:00.000Z',
    });
  });

  it('maps single transfer and delete response', () => {
    expect(
      mapSettlementTransferToApi({
        id: 3,
        fromMemberId: 1,
        toMemberId: 2,
        amount: 500,
        month: '2026-02',
        settledAt: new Date('2026-02-01T00:00:00.000Z'),
      })
    ).toEqual({
      id: 3,
      fromMemberId: 1,
      toMemberId: 2,
      amount: 500,
      month: '2026-02',
      settledAt: '2026-02-01T00:00:00.000Z',
    });

    expect(mapDeletedSettlementTransferToApi(3)).toEqual({ id: 3 });
  });
});
