import { useCallback, useEffect, useMemo, useState } from 'react';

import { receiptApi } from '../../../api/receiptApi';
import { showAlert } from '../../../utils/alertMessage';
import type { FamilyMemberSummary } from '../../../api/generated';
import { useAppSessionContext } from '../../app/contexts/AppSessionContext';

export type ManualReceiptItem = {
  name: string;
  price: string;
  quantity: string;
  categoryId: number | null;
};

const emptyItem = (): ManualReceiptItem => ({ name: '', price: '', quantity: '1', categoryId: null });
const today = () => new Date().toISOString().slice(0, 10);

export function useManualReceipt(onSaved: () => void) {
  const { currentMemberId, categories } = useAppSessionContext();
  const [members, setMembers] = useState<FamilyMemberSummary[]>([]);
  const [memberId, setMemberId] = useState<number | null>(currentMemberId);
  const [storeName, setStoreName] = useState('');
  const [date, setDate] = useState(today);
  const [items, setItems] = useState<ManualReceiptItem[]>([emptyItem()]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const response = await receiptApi.getFamilyMembers();
        if (response.success) setMembers(response.data);
      } catch {
        showAlert('メンバー取得エラー', '世帯メンバーを取得できませんでした。画面を開き直してください。');
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const categoryOptions = useMemo(
    () => categories.map((category) => ({ label: category.name, value: category.id })),
    [categories]
  );
  const total = useMemo(
    () => items.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 0), 0),
    [items]
  );

  const updateItem = useCallback((index: number, key: keyof ManualReceiptItem, value: string | number | null) => {
    setItems((current) => current.map((item, itemIndex) => (
      itemIndex === index ? { ...item, [key]: value } : item
    )));
  }, []);
  const addItem = useCallback(() => setItems((current) => [...current, emptyItem()]), []);
  const removeItem = useCallback((index: number) => {
    setItems((current) => current.length > 1 ? current.filter((_, itemIndex) => itemIndex !== index) : current);
  }, []);

  const save = useCallback(async () => {
    if (!memberId || !storeName.trim() || !date.trim() || items.some((item) => !item.name.trim() || Number(item.price) < 0 || Number(item.quantity) <= 0)) {
      showAlert('入力内容を確認', '登録先、店舗名、購入日、商品名、金額、数量を入力してください。');
      return;
    }
    setIsSaving(true);
    try {
      await receiptApi.createManualReceipt({
        memberId,
        storeName: storeName.trim(),
        date: date.trim(),
        items: items.map((item) => ({
          name: item.name.trim(), price: Number(item.price), quantity: Number(item.quantity), categoryId: item.categoryId,
        })),
      });
      showAlert('登録しました', '手入力のレシートを保存しました。履歴で登録先メンバーを選ぶと確認できます。');
      onSaved();
    } catch {
      // axios interceptor/画面側の共通エラー処理が詳細を通知する。
    } finally {
      setIsSaving(false);
    }
  }, [date, items, memberId, onSaved, storeName]);

  return { members, memberId, setMemberId, storeName, setStoreName, date, setDate, items, isLoading, isSaving, total, categoryOptions, updateItem, addItem, removeItem, save };
}
