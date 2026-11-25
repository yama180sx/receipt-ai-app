import { useEffect, useMemo, useState } from 'react';
import { receiptApi } from '../../../api/receiptApi';
import type { DuplicateCandidate } from '../../../api/generated';
import type { ParsedReceiptItemInput } from '../../../types/receipt';
import type { ReceiptScanInitialData } from '../../../types/receiptScan';
import { showAlert } from '../../../utils/alertMessage';
import { getApiErrorMessage, getApiErrorResponseData } from '../../../utils/apiError';
import { useReceiptImageSource } from '../../../utils/receiptImageSource';
import { isValidReceiptDate, resolveReviewButton } from '../utils/receiptReviewButton';

type ReceiptFormData = ReceiptScanInitialData['parsedData'] & {
  taxAmount: string | number;
};

type UseReceiptScanOptions = {
  initialData: ReceiptScanInitialData;
  categories: Array<{ id: number; name: string }>;
  onSuccess: () => void;
  onCancel: () => void;
};

export function useReceiptScan({
  initialData,
  categories,
  onSuccess,
  onCancel,
}: UseReceiptScanOptions) {
  const [loading, setLoading] = useState(false);
  const [totalOverride, setTotalOverride] = useState(() => initialData.parsedData.totalAmount == null ? '' : String(initialData.parsedData.totalAmount));
  const [candidates, setCandidates] = useState<DuplicateCandidate[] | null>(null);
  const [receiptData, setReceiptData] = useState<ReceiptFormData>({
    ...initialData.parsedData,
    taxAmount: initialData.parsedData.taxAmount ?? '0',
  });
  const [lookup, setLookup] = useState<{ key: string; status: 'ready' | 'error'; count: number }>({ key: '', status: 'ready', count: 0 });
  const [lookupAttempt, setLookupAttempt] = useState(0);

  const categorySelectOptions = useMemo(
    () => categories.map((c) => ({ label: c.name, value: c.id })),
    [categories]
  );

  const imageSource = useReceiptImageSource(initialData.imagePath);

  const calculatedTotal = useMemo(() => {
    const itemsTotal = receiptData.items.reduce((sum, item) => {
      const p = parseFloat(String(item.price)) || 0;
      const q = parseFloat(String(item.quantity)) || 0;
      return sum + p * q;
    }, 0);

    const tax = parseFloat(String(receiptData.taxAmount)) || 0;
    return Math.round(itemsTotal + tax);
  }, [receiptData.items, receiptData.taxAmount]);

  const lookupInput = useMemo(() => {
    const storeName = receiptData.storeName?.trim() ?? '';
    const purchaseDate = receiptData.purchaseDate?.trim() ?? '';
    const totalAmount = totalOverride.trim() === '' ? calculatedTotal : Number(totalOverride);
    if (!storeName || !isValidReceiptDate(purchaseDate) || ((receiptData.totalAmount == null || !Number.isFinite(Number(receiptData.totalAmount))) && totalOverride.trim() === '') || !Number.isSafeInteger(totalAmount) || totalAmount < 0) return null;
    return { storeName, purchaseDate, totalAmount };
  }, [receiptData.storeName, receiptData.purchaseDate, receiptData.totalAmount, totalOverride, calculatedTotal]);
  const lookupKey = lookupInput ? JSON.stringify(lookupInput) : '';
  useEffect(() => {
    if (!lookupInput) return undefined;
    let cancelled = false;
    const timer = setTimeout(() => {
      receiptApi.findDuplicateCandidates(lookupInput).then((result) => {
        if (!cancelled) setLookup({ key: lookupKey, status: 'ready', count: result.hasMore ? 51 : result.candidates.length });
      }).catch(() => {
        if (!cancelled) setLookup({ key: lookupKey, status: 'error', count: 0 });
      });
    }, 500);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [lookupKey, lookupAttempt]);
  const reviewButton = resolveReviewButton(lookupKey, lookup);
  const lookupPending = reviewButton.pending;
  const lookupFailed = reviewButton.failed;

  const updateItem = (
    index: number,
    key: keyof ParsedReceiptItemInput,
    value: ParsedReceiptItemInput[keyof ParsedReceiptItemInput]
  ) => {
    const newItems = [...receiptData.items];
    newItems[index] = { ...newItems[index], [key]: value };
    setReceiptData({ ...receiptData, items: newItems });
  };

  const removeItem = (index: number) => {
    const newItems = receiptData.items.filter((_, i) => i !== index);
    setReceiptData({ ...receiptData, items: newItems });
  };

  const addItem = () => {
    const newItems = [...receiptData.items, { name: '', price: 0, quantity: 1, categoryId: null }];
    setReceiptData({ ...receiptData, items: newItems });
  };

  const handleCommit = async (reviewed?: number[]) => {
    if (loading) return;
    if (!receiptData.storeName?.trim()) { showAlert('店舗名を確認してください', 'レシートの店舗名を入力してください。'); return; }
    if (!receiptData.purchaseDate?.trim()) {
      showAlert('購入日時を確認してください', 'レシートの日付を入力してください。');
      return;
    }
    if (!isValidReceiptDate(receiptData.purchaseDate)) {
      showAlert('購入日時を確認してください', '実在する日付を YYYY-MM-DD または YYYY-MM-DD HH:mm の形式で入力してください。');
      return;
    }
    if ((receiptData.totalAmount == null || !Number.isFinite(Number(receiptData.totalAmount))) && totalOverride.trim() === '') {
      showAlert('合計金額を確認してください', 'レシートの合計金額を入力してください。');
      return;
    }
    setLoading(true);
    try {
      const totalAmount = totalOverride.trim() === '' ? calculatedTotal : Number(totalOverride);
      if (!Number.isFinite(totalAmount) || !Number.isInteger(totalAmount) || totalAmount < 0) { showAlert('金額を確認してください', '正しい合計金額を入力してください。'); return; }
      if (!reviewed) {
        const result = await receiptApi.findDuplicateCandidates({ storeName: receiptData.storeName, purchaseDate: receiptData.purchaseDate, totalAmount });
        if (result.hasMore) { showAlert('候補が多すぎます', '履歴で確認してください。'); return; }
        if (result.candidates.length) { setCandidates(result.candidates); return; }
      }
      const payload = {
        jobId: initialData.jobId,
        reviewedDuplicateIds: reviewed ?? [],
        parsedData: {
          ...receiptData,
          totalAmount,
          taxAmount: parseFloat(String(receiptData.taxAmount)) || 0,
          items: receiptData.items.map((item) => ({
            ...item,
            price: parseFloat(String(item.price)) || 0,
            quantity: parseFloat(String(item.quantity)) || 0,
            categoryId: item.categoryId ? Number(item.categoryId) : null,
          })),
        },
        imagePath: initialData.imagePath,
        validation: initialData.validation,
      };

      const res = await receiptApi.commitReceipt(payload);
      if (res.success) {
        showAlert('成功', 'レシートを保存しました。', { onOk: onSuccess });
        return;
      }
    } catch (err: unknown) {
      const apiError = getApiErrorResponseData(err);
      const message = getApiErrorMessage(err, '保存に失敗しました。');

      if (message === 'DUPLICATE') {
        setCandidates(null);
        setLookup({ key: '', status: 'ready', count: 0 });
        setLookupAttempt((value) => value + 1);
        showAlert('候補が変更されました', '登録済みのレシートをもう一度確認してください。');
        return;
      }

      console.error('Commit error:', apiError || message);
      showAlert('エラー', message || '保存に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    receiptData,
    setReceiptData,
    categorySelectOptions,
    imageSource,
    calculatedTotal,
    totalOverride,
    setTotalOverride,
    candidates,
    closeCandidates: () => setCandidates(null),
    confirmCandidates: () => { if (candidates) { const ids = candidates.map((candidate) => candidate.id); setCandidates(null); void handleCommit(ids); } },
    updateItem,
    removeItem,
    addItem,
    handleCommit,
    lookupPending,
    lookupFailed,
    showDuplicate: Boolean(lookupKey) && !lookupPending && !lookupFailed && lookup.count > 0,
    submitLabel: reviewButton.label,
    handleSubmit: () => {
      if (lookupPending) return;
      if (lookupFailed) { setLookup({ key: '', status: 'ready', count: 0 }); setLookupAttempt((value) => value + 1); return; }
      void handleCommit();
    },
  };
}

export type ReceiptScanFlow = ReturnType<typeof useReceiptScan>;
