import { useMemo, useState } from 'react';
import { receiptApi } from '../../../api/receiptApi';
import type { ParsedReceiptItemInput } from '../../../types/receipt';
import type { ReceiptScanInitialData } from '../../../types/receiptScan';
import { showAlert } from '../../../utils/alertMessage';
import { getApiErrorMessage, getApiErrorResponseData } from '../../../utils/apiError';
import { useReceiptImageSource } from '../../../utils/receiptImageSource';

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
  const [receiptData, setReceiptData] = useState<ReceiptFormData>({
    ...initialData.parsedData,
    taxAmount: initialData.parsedData.taxAmount ?? '0',
  });

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

  const handleCommit = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const payload = {
        jobId: initialData.jobId,
        parsedData: {
          ...receiptData,
          totalAmount: calculatedTotal,
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
        const duplicateMessage = initialData.warnedDuplicateFromTray
          ? '確認トレイで重複の疑いが表示されていました。同じ内容のレシートは保存できません。トレイから破棄するか、履歴で既存レシートを確認してください。'
          : '同じ店名・日付・金額のレシートが世帯内に存在します。履歴画面で確認してください。';
        showAlert('既に登録済みです', duplicateMessage, { onOk: onCancel });
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
    updateItem,
    removeItem,
    addItem,
    handleCommit,
  };
}

export type ReceiptScanFlow = ReturnType<typeof useReceiptScan>;
