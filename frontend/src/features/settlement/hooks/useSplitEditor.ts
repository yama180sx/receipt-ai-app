import { useState, useEffect, useMemo, useCallback } from 'react';
import { receiptApi } from '../../../api/receiptApi';
import { showApiErrorAlert } from '../../../utils/apiError';
import { showAlert } from '../../../utils/alertMessage';
import {
  buildItemSplitSavePayload,
  calcItemTotal,
  deriveInitialActiveMembers,
} from '../../../domain/settlement';
import {
  addMemberToAllItems,
  applyCascadePercentToItems,
  buildInitialSplits,
  calcReceiptTotalAmount,
  parseNonNegativeInt,
  parsePercentInt,
  removeMemberFromAllItems,
  splitAmountEqually,
  sumMemberAmountsAcrossItems,
  updateItemAmount,
  updateItemPercent,
} from '../utils/splitEditorMutations';
import type {
  FamilyMemberSummary,
  ReceiptForSplitEditor,
} from '../../../types/settlement';

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

  const memberIds = useMemo(
    () => activeMembers.map((m) => m.id),
    [activeMembers]
  );
  const remainderMemberId = activeMembers[0]?.id;

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
        showApiErrorAlert('エラー', err, 'メンバー情報の取得に失敗しました。');
      } finally {
        setLoading(false);
      }
    };
    void init();
  }, [receipt]);

  const receiptTotalAmount = useMemo(
    () => calcReceiptTotalAmount(receipt.items),
    [receipt.items]
  );

  const getMemberTotalAmount = useCallback(
    (memberId: number) =>
      sumMemberAmountsAcrossItems(receipt.items, editSplits, memberId),
    [editSplits, receipt.items]
  );

  const addMember = useCallback(
    (memberId: number) => {
      if (activeMembers.find((m) => m.id === memberId)) return;
      const memberToAdd = allMembers.find((m) => m.id === memberId);
      if (!memberToAdd) return;

      setActiveMembers((prev) => [...prev, memberToAdd]);
      setEditSplits((prev) => addMemberToAllItems(prev, memberId));
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
      setEditSplits((prev) => removeMemberFromAllItems(prev, memberId));
    },
    [activeMembers.length]
  );

  const handleAmountChange = useCallback(
    (itemId: number, memberId: number, value: string, itemTotal: number) => {
      setEditSplits((prev) => ({
        ...prev,
        [itemId]: updateItemAmount(
          prev[itemId] ?? {},
          memberId,
          value,
          itemTotal,
          remainderMemberId,
          memberIds
        ),
      }));
    },
    [memberIds, remainderMemberId]
  );

  const handlePercentChange = useCallback(
    (itemId: number, memberId: number, value: string, itemTotal: number) => {
      setEditSplits((prev) => ({
        ...prev,
        [itemId]: updateItemPercent(
          prev[itemId] ?? {},
          memberId,
          value,
          itemTotal,
          remainderMemberId,
          memberIds
        ),
      }));
    },
    [memberIds, remainderMemberId]
  );

  const splitItemEqually = useCallback(
    (itemId: number, itemTotal: number) => {
      if (memberIds.length === 0) return;
      setEditSplits((prev) => ({
        ...prev,
        [itemId]: splitAmountEqually(itemTotal, memberIds),
      }));
    },
    [memberIds]
  );

  const applyCascadePercent = useCallback(
    (memberId: number, percent: number) => {
      if (!remainderMemberId) return;
      setEditSplits((prev) =>
        applyCascadePercentToItems(
          prev,
          receipt.items,
          memberId,
          percent,
          remainderMemberId,
          memberIds
        )
      );
    },
    [memberIds, receipt.items, remainderMemberId]
  );

  const handleTotalAmountChange = useCallback(
    (memberId: number, value: string) => {
      const valToSet = parseNonNegativeInt(value, receiptTotalAmount);
      const percent =
        receiptTotalAmount > 0 ? (valToSet / receiptTotalAmount) * 100 : 0;
      applyCascadePercent(memberId, percent);
    },
    [applyCascadePercent, receiptTotalAmount]
  );

  const handleTotalPercentChange = useCallback(
    (memberId: number, value: string) => {
      applyCascadePercent(memberId, parsePercentInt(value));
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

    const saveRemainderMemberId = activeMembers[0].id;
    setSaving(true);
    try {
      const savePromises = receipt.items.map(async (item) => {
        const amounts = editSplits[item.id] ?? {};
        const payloadSplits = buildItemSplitSavePayload(
          activeMembers,
          amounts,
          saveRemainderMemberId
        );
        return receiptApi.saveItemSplits(item.id, payloadSplits);
      });

      await Promise.all(savePromises);
      showAlert('保存完了', '割り勘設定を保存しました。', { onOk: onBack });
    } catch (err) {
      showApiErrorAlert('エラー', err, '保存に失敗しました。');
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
