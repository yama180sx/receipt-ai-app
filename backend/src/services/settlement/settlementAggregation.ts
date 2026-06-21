import { calcItemLineTotal } from '../../utils/itemLineTotal';

export type SettlementMemberSeed = {
  id: number;
  name: string;
};

export type SettlementSplitInput = {
  familyMemberId: number;
  amount: number;
};

export type SettlementItemInput = {
  price: number;
  quantity: number;
  splits: SettlementSplitInput[];
};

export type SettlementReceiptInput = {
  memberId: number;
  items: SettlementItemInput[];
};

export type SettlementTransferInput = {
  fromMemberId: number;
  toMemberId: number;
  amount: number;
};

export type MemberStatAccum = {
  name: string;
  totalPaid: number;
  totalOwed: number;
  baseBalance: number;
  transferredOut: number;
  transferredIn: number;
  balance: number;
};

export type SettlementMemberSummary = {
  memberId: number;
  name: string;
  totalPaid: number;
  totalOwed: number;
  baseBalance: number;
  transferredOut: number;
  transferredIn: number;
  balance: number;
};

/** domain-model.md §5 — メンバーごとの集計器を初期化 */
export function initMemberStats(members: SettlementMemberSeed[]): Record<number, MemberStatAccum> {
  const stats: Record<number, MemberStatAccum> = {};
  for (const m of members) {
    stats[m.id] = {
      name: m.name,
      totalPaid: 0,
      totalOwed: 0,
      baseBalance: 0,
      transferredOut: 0,
      transferredIn: 0,
      balance: 0,
    };
  }
  return stats;
}

/** domain-model.md §4.3 — 暗黙デフォルト（Split なし＝支払者全額負担）を含むレシート集計 */
export function aggregateReceiptsIntoStats(
  stats: Record<number, MemberStatAccum>,
  receipts: SettlementReceiptInput[]
): void {
  for (const receipt of receipts) {
    let receiptTotalPaid = 0;

    for (const item of receipt.items) {
      const itemPriceInt = calcItemLineTotal(item.price, item.quantity);
      receiptTotalPaid += itemPriceInt;

      if (item.splits.length > 0) {
        for (const split of item.splits) {
          if (stats[split.familyMemberId]) {
            stats[split.familyMemberId].totalOwed += split.amount;
          }
        }
      } else if (stats[receipt.memberId]) {
        stats[receipt.memberId].totalOwed += itemPriceInt;
      }
    }

    if (stats[receipt.memberId]) {
      stats[receipt.memberId].totalPaid += receiptTotalPaid;
    }
  }
}

/** domain-model.md §5 — 送金実績を集計 */
export function aggregateTransfersIntoStats(
  stats: Record<number, MemberStatAccum>,
  transfers: SettlementTransferInput[]
): void {
  for (const t of transfers) {
    if (stats[t.fromMemberId]) stats[t.fromMemberId].transferredOut += t.amount;
    if (stats[t.toMemberId]) stats[t.toMemberId].transferredIn += t.amount;
  }
}

/** domain-model.md §5 — baseBalance / balance を確定 */
export function finalizeMemberStats(stats: Record<number, MemberStatAccum>): SettlementMemberSummary[] {
  return Object.entries(stats).map(([id, s]) => {
    s.baseBalance = s.totalPaid - s.totalOwed;
    s.balance = s.baseBalance + s.transferredOut - s.transferredIn;

    return {
      memberId: Number(id),
      name: s.name,
      totalPaid: s.totalPaid,
      totalOwed: s.totalOwed,
      baseBalance: s.baseBalance,
      transferredOut: s.transferredOut,
      transferredIn: s.transferredIn,
      balance: s.balance,
    };
  });
}

/** レシート・送金からメンバー別精算サマリーを算出（純粋関数） */
export function computeSettlementMemberSummaries(
  members: SettlementMemberSeed[],
  receipts: SettlementReceiptInput[],
  transfers: SettlementTransferInput[]
): SettlementMemberSummary[] {
  const stats = initMemberStats(members);
  aggregateReceiptsIntoStats(stats, receipts);
  aggregateTransfersIntoStats(stats, transfers);
  return finalizeMemberStats(stats);
}
