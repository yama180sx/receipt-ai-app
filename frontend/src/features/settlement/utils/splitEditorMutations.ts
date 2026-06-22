import { calcItemTotal } from '../../../utils/splitEditorSplits';
import type {
  FamilyMemberSummary,
  ReceiptForSplitEditor,
} from '../../../types/settlement';

export type SplitAmountsByItem = Record<number, Record<number, number>>;

/** 数字以外を除去し、0 以上の整数にパースする */
export function parseNonNegativeInt(value: string, max?: number): number {
  const numericValue = value.replace(/[^0-9]/g, '');
  let parsed = numericValue === '' ? 0 : parseInt(numericValue, 10);
  if (max !== undefined && parsed > max) {
    parsed = max;
  }
  return parsed;
}

/** 0〜100 のパーセント整数にパースする */
export function parsePercentInt(value: string): number {
  return parseNonNegativeInt(value, 100);
}

/** 先頭メンバーに端数を寄せ、合計が itemTotal になるよう調整する */
export function applyRemainderToFirst(
  amounts: Record<number, number>,
  itemTotal: number,
  remainderMemberId: number,
  memberIds: number[]
): Record<number, number> {
  const next = { ...amounts };
  let sumOthers = 0;
  memberIds.forEach((id) => {
    if (id !== remainderMemberId) {
      sumOthers += next[id] || 0;
    }
  });
  next[remainderMemberId] = Math.max(0, itemTotal - sumOthers);
  return next;
}

export function buildInitialSplits(
  receipt: ReceiptForSplitEditor,
  targetMembers: FamilyMemberSummary[]
): SplitAmountsByItem {
  const initialData: SplitAmountsByItem = {};
  receipt.items.forEach((item) => {
    initialData[item.id] = {};
    const itemTotal = calcItemTotal(item);

    if (item.splits && item.splits.length > 0) {
      targetMembers.forEach((m) => {
        const split = item.splits!.find((s) => s.familyMemberId === m.id);
        initialData[item.id][m.id] = split ? split.amount : 0;
      });
    } else {
      targetMembers.forEach((m) => {
        initialData[item.id][m.id] =
          m.id === receipt.memberId ? itemTotal : 0;
      });
    }
  });
  return initialData;
}

export function calcReceiptTotalAmount(
  items: ReceiptForSplitEditor['items']
): number {
  return items.reduce((sum, item) => sum + calcItemTotal(item), 0);
}

export function sumMemberAmountsAcrossItems(
  items: ReceiptForSplitEditor['items'],
  editSplits: SplitAmountsByItem,
  memberId: number
): number {
  return items.reduce(
    (sum, item) => sum + (editSplits[item.id]?.[memberId] || 0),
    0
  );
}

/** 均等割り（端数は memberIds[0] に寄せる） */
export function splitAmountEqually(
  itemTotal: number,
  memberIds: number[]
): Record<number, number> {
  if (memberIds.length === 0) return {};

  const baseAmount = Math.floor(itemTotal / memberIds.length);
  const result: Record<number, number> = {};
  memberIds.forEach((id, idx) => {
    result[id] =
      idx === 0 ? itemTotal - baseAmount * (memberIds.length - 1) : baseAmount;
  });
  return result;
}

export function updateItemAmount(
  current: Record<number, number>,
  memberId: number,
  value: string,
  itemTotal: number,
  remainderMemberId: number | undefined,
  memberIds: number[]
): Record<number, number> {
  const valToSet = parseNonNegativeInt(value, itemTotal);
  let next = { ...current, [memberId]: valToSet };

  if (remainderMemberId && memberId !== remainderMemberId) {
    next = applyRemainderToFirst(next, itemTotal, remainderMemberId, memberIds);
  }
  return next;
}

export function updateItemPercent(
  current: Record<number, number>,
  memberId: number,
  value: string,
  itemTotal: number,
  remainderMemberId: number | undefined,
  memberIds: number[]
): Record<number, number> {
  const percent = parsePercentInt(value);
  const calculatedAmount = Math.round(itemTotal * (percent / 100));
  let next = { ...current, [memberId]: calculatedAmount };

  if (remainderMemberId && memberId !== remainderMemberId) {
    next = applyRemainderToFirst(next, itemTotal, remainderMemberId, memberIds);
  }
  return next;
}

export function applyCascadePercentToItems(
  editSplits: SplitAmountsByItem,
  items: ReceiptForSplitEditor['items'],
  memberId: number,
  percent: number,
  remainderMemberId: number,
  memberIds: number[]
): SplitAmountsByItem {
  if (memberIds.length <= 1 || percent < 0 || percent > 100) {
    return editSplits;
  }
  if (memberId === remainderMemberId) {
    return editSplits;
  }

  const next = { ...editSplits };
  items.forEach((item) => {
    const itemTotal = calcItemTotal(item);
    const itemAmounts = { ...(next[item.id] ?? {}) };
    itemAmounts[memberId] = Math.round(itemTotal * (percent / 100));
    next[item.id] = applyRemainderToFirst(
      itemAmounts,
      itemTotal,
      remainderMemberId,
      memberIds
    );
  });
  return next;
}

export function addMemberToAllItems(
  editSplits: SplitAmountsByItem,
  memberId: number
): SplitAmountsByItem {
  const next = { ...editSplits };
  Object.keys(next).forEach((itemId) => {
    next[Number(itemId)] = { ...next[Number(itemId)], [memberId]: 0 };
  });
  return next;
}

export function removeMemberFromAllItems(
  editSplits: SplitAmountsByItem,
  memberId: number
): SplitAmountsByItem {
  const next = { ...editSplits };
  Object.keys(next).forEach((itemId) => {
    const nId = Number(itemId);
    const newData = { ...next[nId] };
    delete newData[memberId];
    next[nId] = newData;
  });
  return next;
}
