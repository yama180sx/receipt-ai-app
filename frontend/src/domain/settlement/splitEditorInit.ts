import type { FamilyMemberSummary, ReceiptForSplitEditor } from '../../types/settlement';

/** 割勘エディタ起動時の対象メンバー初期集合を決定する */
export function deriveInitialActiveMembers(
  allMembers: FamilyMemberSummary[],
  receipt: ReceiptForSplitEditor
): FamilyMemberSummary[] {
  const hasExistingSplits = receipt.items.some(
    (item) => item.splits && item.splits.length > 0
  );

  let initialActive: FamilyMemberSummary[] = [];

  if (hasExistingSplits) {
    const splitMemberIds = new Set<number>();
    receipt.items.forEach((item) => {
      item.splits?.forEach((s) => splitMemberIds.add(s.familyMemberId));
    });

    const payer = allMembers.find((m) => m.id === receipt.memberId);
    if (payer) initialActive.push(payer);

    allMembers.forEach((m) => {
      if (splitMemberIds.has(m.id) && m.id !== receipt.memberId) {
        initialActive.push(m);
      }
    });
  } else {
    const payer = allMembers.find((m) => m.id === receipt.memberId);
    if (payer) initialActive.push(payer);
    const others = allMembers.filter((m) => m.id !== receipt.memberId);
    if (others.length > 0) initialActive.push(others[0]);
  }

  if (initialActive.length === 0) {
    initialActive = allMembers.slice(0, 2);
  }

  return initialActive;
}
