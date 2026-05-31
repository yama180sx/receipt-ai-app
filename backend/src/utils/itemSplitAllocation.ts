import { AppError } from './appError';

export type SplitInput = {
  familyMemberId: number;
  ratio?: number;
  amount?: number;
};

export type AllocatedSplit = {
  familyMemberId: number;
  amount: number;
};

/**
 * 明細小計に対する按分額を算出。端数は配列の最後のメンバーに寄せる。
 */
export function allocateItemSplits(
  totalAmount: number,
  splits: SplitInput[]
): AllocatedSplit[] {
  if (totalAmount < 0) {
    throw new AppError('Invalid item total amount', 400);
  }
  if (splits.length === 0) {
    return [];
  }

  const memberIds = splits.map((s) => Number(s.familyMemberId));
  if (memberIds.some((id) => !Number.isFinite(id) || id <= 0)) {
    throw new AppError('Invalid familyMemberId in splits', 400);
  }
  if (new Set(memberIds).size !== memberIds.length) {
    throw new AppError('Duplicate familyMemberId in splits', 400);
  }

  let allocatedAmount = 0;
  const finalSplits: AllocatedSplit[] = [];

  splits.forEach((split, index) => {
    let amount = 0;

    if (index === splits.length - 1) {
      amount = totalAmount - allocatedAmount;
    } else if (split.amount !== undefined && split.amount !== null) {
      amount = Math.round(Number(split.amount));
    } else if (split.ratio !== undefined && split.ratio !== null) {
      amount = Math.round(totalAmount * Number(split.ratio));
    } else {
      throw new AppError('Each split requires ratio or amount (except last member)', 400);
    }

    if (amount < 0) {
      throw new AppError('Split amount cannot be negative', 400);
    }

    allocatedAmount += amount;
    finalSplits.push({
      familyMemberId: Number(split.familyMemberId),
      amount,
    });
  });

  const sum = finalSplits.reduce((acc, s) => acc + s.amount, 0);
  if (sum !== totalAmount) {
    throw new AppError('Split amounts do not sum to item total', 400);
  }

  return finalSplits;
}
