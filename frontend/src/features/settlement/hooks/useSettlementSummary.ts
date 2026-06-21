import { useState, useEffect, useMemo, useCallback } from 'react';
import { statsApi } from '../../../api/statsApi';
import { getCurrentYearMonth, getRecentYearMonths } from '../../../utils/monthSelectOptions';
import { showAlert } from '../../../utils/alertMessage';
import { showConfirmDialog } from '../../../utils/confirmDialog';
import { BUTTON_LABELS } from '../../../constants/buttonLabels';
import {
  isTransferFormValid,
  validateSettlementTransferForm,
  type TransferFormErrors,
} from '../utils/settlementTransferForm';
import { parsePositiveYenAmount } from '../../../utils/parsePositiveYenAmount';
import type {
  SettlementMemberSummary,
  SettlementTransfer,
} from '../../../types/settlement';

export function useSettlementSummary() {
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentYearMonth);
  const [summaryData, setSummaryData] = useState<SettlementMemberSummary[]>([]);
  const [transferList, setTransferList] = useState<SettlementTransfer[]>([]);
  const [cancellingTransferId, setCancellingTransferId] = useState<number | null>(null);

  const [isTransferModalVisible, setTransferModalVisible] = useState(false);
  const [transferFrom, setTransferFrom] = useState<number | null>(null);
  const [transferTo, setTransferTo] = useState<number | null>(null);
  const [transferAmount, setTransferAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [transferFieldErrors, setTransferFieldErrors] = useState<TransferFormErrors>({});

  const months = useMemo(() => getRecentYearMonths(6), []);

  const memberSelectOptions = useMemo(
    () =>
      summaryData.map((m) => ({
        label: m.name,
        value: m.memberId,
      })),
    [summaryData]
  );

  const memberNameById = useMemo(() => {
    const map = new Map<number, string>();
    summaryData.forEach((m) => map.set(m.memberId, m.name));
    return map;
  }, [summaryData]);

  const sortedTransfers = useMemo(
    () =>
      [...transferList].sort(
        (a, b) =>
          new Date(b.settledAt).getTime() - new Date(a.settledAt).getTime()
      ),
    [transferList]
  );

  const loadSettlementData = useCallback(async (options?: { silent?: boolean }) => {
    try {
      if (!options?.silent) {
        setLoading(true);
      }
      const res = await statsApi.getSettlementStatus(selectedMonth);
      if (res.success) {
        setSummaryData(res.data?.members ?? []);
        setTransferList(res.data?.transfers ?? []);
      }
    } catch (err) {
      console.error('精算サマリーの取得失敗:', err);
      showAlert('エラー', '精算サマリーの取得に失敗しました。');
    } finally {
      setLoading(false);
    }
  }, [selectedMonth]);

  useEffect(() => {
    void loadSettlementData();
  }, [loadSettlementData]);

  const openTransferModal = useCallback(() => {
    setTransferFieldErrors({});
    setTransferModalVisible(true);
  }, []);

  const closeTransferModal = useCallback(() => {
    setTransferModalVisible(false);
  }, []);

  const handleTransferSubmit = useCallback(async () => {
    const errors = validateSettlementTransferForm({
      transferFrom,
      transferTo,
      transferAmount,
    });
    setTransferFieldErrors(errors);
    if (!isTransferFormValid(errors)) {
      return;
    }

    const amountNum = parsePositiveYenAmount(transferAmount);
    if (amountNum === null) {
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await statsApi.addSettlementTransfer({
        month: selectedMonth,
        fromMemberId: transferFrom!,
        toMemberId: transferTo!,
        amount: amountNum,
      });
      if (res.success) {
        showAlert('成功', '送金記録を登録しました。');
        setTransferModalVisible(false);
        setTransferFrom(null);
        setTransferTo(null);
        setTransferAmount('');
        setTransferFieldErrors({});
        await loadSettlementData();
      }
    } catch (err) {
      console.error('送金記録エラー', err);
      showAlert('エラー', '送金記録の登録に失敗しました。');
    } finally {
      setIsSubmitting(false);
    }
  }, [
    loadSettlementData,
    selectedMonth,
    transferAmount,
    transferFrom,
    transferTo,
  ]);

  const executeCancelTransfer = useCallback(
    async (transfer: SettlementTransfer) => {
      const fromName =
        memberNameById.get(transfer.fromMemberId) ??
        `ID:${transfer.fromMemberId}`;
      const toName =
        memberNameById.get(transfer.toMemberId) ?? `ID:${transfer.toMemberId}`;

      setCancellingTransferId(transfer.id);
      try {
        const res = await statsApi.deleteSettlementTransfer(transfer.id);
        if (res.success) {
          showAlert('完了', '送金記録を取り消しました。');
          await loadSettlementData({ silent: true });
        }
      } catch (err) {
        console.error('送金取消エラー', err);
        showAlert(
          'エラー',
          `${fromName} → ${toName} ¥${transfer.amount.toLocaleString()} の取消に失敗しました。`
        );
      } finally {
        setCancellingTransferId(null);
      }
    },
    [loadSettlementData, memberNameById]
  );

  const handleCancelTransfer = useCallback(
    (transfer: SettlementTransfer) => {
      const fromName =
        memberNameById.get(transfer.fromMemberId) ??
        `ID:${transfer.fromMemberId}`;
      const toName =
        memberNameById.get(transfer.toMemberId) ?? `ID:${transfer.toMemberId}`;

      showConfirmDialog(
        '送金記録の取消',
        `${fromName} → ${toName}\n¥${transfer.amount.toLocaleString()}\n\nこの送金記録を取り消しますか？精算残額が更新されます。`,
        [
          { text: BUTTON_LABELS.cancel, style: 'cancel' },
          {
            text: BUTTON_LABELS.cancelTransfer,
            style: 'destructive',
            onPress: () => void executeCancelTransfer(transfer),
          },
        ]
      );
    },
    [executeCancelTransfer, memberNameById]
  );

  return {
    loading,
    selectedMonth,
    setSelectedMonth,
    summaryData,
    months,
    memberSelectOptions,
    memberNameById,
    sortedTransfers,
    cancellingTransferId,
    isTransferModalVisible,
    transferFrom,
    setTransferFrom,
    transferTo,
    setTransferTo,
    transferAmount,
    setTransferAmount,
    transferFieldErrors,
    setTransferFieldErrors,
    isSubmitting,
    openTransferModal,
    closeTransferModal,
    handleTransferSubmit,
    handleCancelTransfer,
  };
}
