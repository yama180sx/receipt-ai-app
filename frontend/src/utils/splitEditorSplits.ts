import type { ItemSplitInput } from '../api/generated';

/** 明細の税込小計（Backend の calcItemLineTotal と同じ丸め） */
export function calcItemTotal(item: {
  price?: unknown;
  quantity?: unknown;
}): number {
  return Math.round(
    (parseFloat(String(item.price ?? 0)) || 0) *
      (parseFloat(String(item.quantity ?? 1)) || 1)
  );
}

export type SplitSaveMember = { id: number };

/**
 * 按分保存用 payload。UI の端数負担者（先頭）を配列末尾に置き、
 * Backend（#87-2）の「最後の要素に残額」ルールと一致させる。
 */
export function buildItemSplitSavePayload(
  activeMembers: SplitSaveMember[],
  amountsByMemberId: Record<number, number>,
  remainderMemberId: number
): ItemSplitInput[] {
  if (activeMembers.length === 0) return [];

  const others = activeMembers.filter((m) => m.id !== remainderMemberId);
  const remainder = activeMembers.find((m) => m.id === remainderMemberId);
  const ordered = remainder ? [...others, remainder] : activeMembers;

  return ordered.map((m) => ({
    familyMemberId: m.id,
    amount: amountsByMemberId[m.id] ?? 0,
  }));
}
