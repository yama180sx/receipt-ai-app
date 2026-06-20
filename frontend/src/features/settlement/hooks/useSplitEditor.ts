import { useState, useEffect, useMemo, useCallback } from 'react';
import { receiptApi } from '../../../api/receiptApi';
import { showAlert } from '../../../utils/alertMessage';
import {
  buildItemSplitSavePayload,
  calcItemTotal,
} from '../../../utils/splitEditorSplits';
import { deriveInitialActiveMembers } from '../utils/splitEditorInit';
import type {
  FamilyMemberSummary,
  ReceiptForSplitEditor,
} from '../../../types/settlement';

function buildInitialSplits(
  receipt: ReceiptForSplitEditor,
  targetMembers: FamilyMemberSummary[]
): Record<number, Record<number, number>> {
  const initialData: Record<number, Record<number, number>> = {};
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

export function useSplitEditor(
  receipt: ReceiptForSplitEditor,
  onBack: () => void
) {
  const [allMembers, setAllMembers] = useState<FamilyMemberSummary[]>([]);
  const [activeMembers, setActiveMembers] = useState<FamilyMemberSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editSplits, setEditSplits] = useState<
    Record<number, Record<number, number>>
  >({});

  useEffect(() => {
    const init = async () => {
      try {
        const res = await receiptApi.getFamilyMembers();
        if (res.success) {
          setAllMembers(res.data);
          const initialActive = deriveInitialActiveMembers(res.data, receipt);
          setActiveMembers(initialActive);
          setEditSplits(buildInitialSplits(receipt, initialActive));
        }
      } catch (err) {
        console.error('メンバー取得失敗', err);
        showAlert('エラー', 'メンバー情報の取得に失敗しました。');
      } finally {
        setLoading(false);
      }
    };
    void init();
  }, [receipt]);

  const receiptTotalAmount = useMemo(
    () =>
      receipt.items.reduce((sum, item) => sum + calcItemTotal(item), 0),
    [receipt.items]
  );

  const getMemberTotalAmount = useCallback(
    (memberId: number) => {
      let sum = 0;
      receipt.items.forEach((item) => {
        sum += editSplits[item.id]?.[memberId] || 0;
      });
      return sum;
    },
    [editSplits, receipt.items]
  );

  const addMember = useCallback(
    (memberId: number) => {
      if (activeMembers.find((m) => m.id === memberId)) return;
      const memberToAdd = allMembers.find((m) => m.id === memberId);
      if (!memberToAdd) return;

      const newActive = [...activeMembers, memberToAdd];
      setActiveMembers(newActive);
      setEditSplits((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((itemId) => {
          next[Number(itemId)] = { ...next[Number(itemId)], [memberId]: 0 };
        });
        return next;
      });
    },
    [activeMembers, allMembers]
  );

  const removeMember = useCallback(
    (memberId: number) => {
      if (activeMembers.length <= 1) {
        showAlert('エラー', '対象者は最低1人必要です。');
        return;
      }
      setActiveMembers((prev) => prev.filter((m) => m.id !== memberId));
      setEditSplits((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((itemId) => {
          const nId = Number(itemId);
          const newData = { ...next[nId] };
          delete newData[memberId];
          next[nId] = newData;
        });
        return next;
      });
    },
    [activeMembers.length]
  );

  const applyRemainderToFirst = useCallback(
    (
      newData: Record<number, number>,
      itemTotal: number,
      firstMemberId: number
    ) => {
      let sumOthers = 0;
      activeMembers.forEach((m) => {
        if (m.id !== firstMemberId) {
          sumOthers += newData[m.id] || 0;
        }
      });
      newData[firstMemberId] = Math.max(0, itemTotal - sumOthers);
    },
    [activeMembers]
  );

  const handleAmountChange = useCallback(
    (itemId: number, memberId: number, value: string, itemTotal: number) => {
      const numericValue = value.replace(/[^0-9]/g, '');
      let valToSet = numericValue === '' ? 0 : parseInt(numericValue, 10);
      if (valToSet > itemTotal) valToSet = itemTotal;

      const newData = { ...editSplits[itemId] };
      newData[memberId] = valToSet;

      const firstMemberId = activeMembers[0]?.id;
      if (firstMemberId && memberId !== firstMemberId) {
        applyRemainderToFirst(newData, itemTotal, firstMemberId);
      }

      setEditSplits((prev) => ({ ...prev, [itemId]: newData }));
    },
    [activeMembers, applyRemainderToFirst, editSplits]
  );

  const handlePercentChange = useCallback(
    (itemId: number, memberId: number, value: string, itemTotal: number) => {
      const numericValue = value.replace(/[^0-9]/g, '');
      let percent = numericValue === '' ? 0 : parseInt(numericValue, 10);
      if (percent > 100) percent = 100;

      const calculatedAmount = Math.round(itemTotal * (percent / 100));
      const newData = { ...editSplits[itemId] };
      newData[memberId] = calculatedAmount;

      const firstMemberId = activeMembers[0]?.id;
      if (firstMemberId && memberId !== firstMemberId) {
        applyRemainderToFirst(newData, itemTotal, firstMemberId);
      }

      setEditSplits((prev) => ({ ...prev, [itemId]: newData }));
    },
    [activeMembers, applyRemainderToFirst, editSplits]
  );

  const splitItemEqually = useCallback(
    (itemId: number, itemTotal: number) => {
      const memberCount = activeMembers.length;
      if (memberCount === 0) return;

      const baseAmount = Math.floor(itemTotal / memberCount);
      const newData = { ...editSplits[itemId] };
      activeMembers.forEach((m, idx) => {
        newData[m.id] =
          idx === 0 ? itemTotal - baseAmount * (memberCount - 1) : baseAmount;
      });

      setEditSplits((prev) => ({ ...prev, [itemId]: newData }));
    },
    [activeMembers, editSplits]
  );

  const applyCascadePercent = useCallback(
    (memberId: number, percent: number) => {
      if (activeMembers.length <= 1 || percent < 0 || percent > 100) return;

      const firstMemberId = activeMembers[0].id;
      if (memberId === firstMemberId) return;

      setEditSplits((prev) => {
        const next = { ...prev };
        receipt.items.forEach((item) => {
          const itemTotal = calcItemTotal(item);
          const newData = { ...next[item.id] };
          newData[memberId] = Math.round(itemTotal * (percent / 100));
          applyRemainderToFirst(newData, itemTotal, firstMemberId);
          next[item.id] = newData;
        });
        return next;
      });
    },
    [activeMembers, applyRemainderToFirst, receipt.items]
  );

  const handleTotalAmountChange = useCallback(
    (memberId: number, value: string) => {
      const numericValue = value.replace(/[^0-9]/g, '');
      let valToSet = numericValue === '' ? 0 : parseInt(numericValue, 10);
      if (valToSet > receiptTotalAmount) valToSet = receiptTotalAmount;

      const percent =
        receiptTotalAmount > 0 ? (valToSet / receiptTotalAmount) * 100 : 0;
      applyCascadePercent(memberId, percent);
    },
    [applyCascadePercent, receiptTotalAmount]
  );

  const handleTotalPercentChange = useCallback(
    (memberId: number, value: string) => {
      const numericValue = value.replace(/[^0-9]/g, '');
      const percent = numericValue === '' ? 0 : parseInt(numericValue, 10);
      applyCascadePercent(memberId, percent);
    },
    [applyCascadePercent]
  );

  const splitWholeReceiptEqually = useCallback(() => {
    receipt.items.forEach((item) => {
      splitItemEqually(item.id, calcItemTotal(item));
    });
  }, [receipt.items, splitItemEqually]);

  const handleSave = useCallback(async () => {
    if (activeMembers.length === 0) {
      showAlert('エラー', '対象者を1人以上選択してください。');
      return;
    }

    const remainderMemberId = activeMembers[0].id;
    setSaving(true);
    try {
      const savePromises = receipt.items.map(async (item) => {
        const amounts = editSplits[item.id] ?? {};
        const payloadSplits = buildItemSplitSavePayload(
          activeMembers,
          amounts,
          remainderMemberId
        );
        return receiptApi.saveItemSplits(item.id, payloadSplits);
      });

      await Promise.all(savePromises);
      showAlert('保存完了', '割り勘設定を保存しました。', { onOk: onBack });
    } catch (err) {
      console.error('保存エラー', err);
      showAlert('エラー', '保存に失敗しました。');
    } finally {
      setSaving(false);
    }
  }, [activeMembers, editSplits, onBack, receipt.items]);

  const inactiveMembers = useMemo(
    () => allMembers.filter((am) => !activeMembers.find((m) => m.id === am.id)),
    [activeMembers, allMembers]
  );

  return {
    loading,
    saving,
    activeMembers,
    inactiveMembers,
    editSplits,
    receiptTotalAmount,
    addMember,
    removeMember,
    handleAmountChange,
    handlePercentChange,
    splitItemEqually,
    handleTotalAmountChange,
    handleTotalPercentChange,
    splitWholeReceiptEqually,
    getMemberTotalAmount,
    handleSave,
  };
}
