import { useCallback, useEffect, useMemo, useState } from 'react';
import { categoryApi, receiptApi } from '../../../api';
import { useIsWideLayout } from '../../../hooks/useIsWideLayout';
import type { CategorySummary, ReceiptDetail } from '../../../types/receipt';
import type { FamilyMemberSummary } from '../../../types/settlement';
import { showAlert } from '../../../utils/alertMessage';
import { getRecentYearMonths, useMonthSelectOptions } from '../../../utils/monthSelectOptions';

type UseReceiptHistoryOptions = {
  currentMemberId: number;
};

export function useReceiptHistory({ currentMemberId }: UseReceiptHistoryOptions) {
  const isWide = useIsWideLayout();

  const [loading, setLoading] = useState(true);
  const [receipts, setReceipts] = useState<ReceiptDetail[]>([]);
  const [categories, setCategories] = useState<CategorySummary[]>([]);
  const [members, setMembers] = useState<FamilyMemberSummary[]>([]);
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptDetail | null>(null);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedMember, setSelectedMember] = useState(currentMemberId.toString());

  const months = useMemo(() => getRecentYearMonths(6), []);
  const monthSelectOptions = useMonthSelectOptions(months, isWide);
  const memberSelectOptions = useMemo(
    () =>
      members.map((m) => ({
        label: m.id === currentMemberId ? `自分 (${m.name})` : m.name,
        value: m.id.toString(),
      })),
    [members, currentMemberId]
  );

  const API_URL = process.env.EXPO_PUBLIC_API_URL || '';
  const baseUrl = API_URL.replace(/\/api\/?$/, '');

  const fetchCategories = useCallback(async () => {
    try {
      const res = await categoryApi.listCategories();
      if (res.success) {
        setCategories(res.data);
      }
    } catch (err) {
      console.error('カテゴリー取得失敗', err);
    }
  }, []);

  const fetchMembers = useCallback(async () => {
    try {
      const res = await receiptApi.getFamilyMembers();
      if (res.success) {
        setMembers(res.data);
      }
    } catch (err) {
      console.error('世帯メンバー取得失敗', err);
    }
  }, []);

  const fetchReceipts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await receiptApi.listReceipts({
        ...(selectedMonth ? { month: selectedMonth } : {}),
        memberId: selectedMember,
      });
      if (res.success) {
        const data = res.data;
        setReceipts(data);

        if (selectedReceipt) {
          const updated = data.find((r: ReceiptDetail) => r.id === selectedReceipt.id);
          if (updated) setSelectedReceipt(updated);
        } else if (isWide && data.length > 0) {
          setSelectedReceipt(data[0]);
        }
      }
    } catch (err) {
      console.error('履歴取得失敗', err);
      showAlert('エラー', '履歴の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedMember, isWide, selectedReceipt?.id]);

  useEffect(() => {
    fetchCategories();
    fetchMembers();
  }, [fetchCategories, fetchMembers]);

  useEffect(() => {
    fetchReceipts();
  }, [selectedMonth, selectedMember]);

  const handleCategoryChange = async (itemId: number, categoryId: number | null) => {
    if (!categoryId) return;
    try {
      const response = await receiptApi.updateItemCategory(itemId, Number(categoryId));

      if (response.success) {
        const updatedItem = response.data;
        const mapper = (r: ReceiptDetail): ReceiptDetail => ({
          ...r,
          items: r.items.map((item) =>
            item.id === itemId
              ? { ...item, categoryId: updatedItem.categoryId, category: updatedItem.category }
              : item
          ),
        });

        setReceipts((prev) => prev.map(mapper));
        if (selectedReceipt) setSelectedReceipt((prev) => (prev ? mapper(prev) : null));
      }
    } catch (err) {
      console.error('カテゴリー更新失敗', err);
      showAlert('エラー', 'カテゴリーの更新に失敗しました');
    }
  };

  return {
    isWide,
    loading,
    receipts,
    categories,
    selectedReceipt,
    setSelectedReceipt,
    selectedMonth,
    setSelectedMonth,
    selectedMember,
    setSelectedMember,
    monthSelectOptions,
    memberSelectOptions,
    baseUrl,
    fetchReceipts,
    handleCategoryChange,
  };
}
