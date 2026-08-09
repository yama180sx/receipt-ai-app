import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { categoryApi, receiptApi } from '../../../api';
import { useIsWideLayout } from '../../../hooks/useIsWideLayout';
import type { CategorySummary, ReceiptDetail } from '../../../types/receipt';
import type { FamilyMemberSummary } from '../../../types/settlement';
import { showApiErrorAlert } from '../../../utils/apiError';
import { getRecentYearMonths, useMonthSelectOptions } from '../../../utils/monthSelectOptions';
import {
  appendReceiptHistoryPage,
  canLoadMore,
  replaceReceiptHistoryPage,
  type ReceiptHistoryPaginationState,
} from '../utils/receiptHistoryPagination';

type UseReceiptHistoryOptions = {
  currentMemberId: number;
};

export function useReceiptHistory({ currentMemberId }: UseReceiptHistoryOptions) {
  const isWide = useIsWideLayout();

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [receipts, setReceipts] = useState<ReceiptDetail[]>([]);
  const [pagination, setPagination] = useState<ReceiptHistoryPaginationState>({
    items: [],
    nextCursor: null,
    hasNext: false,
  });
  const [categories, setCategories] = useState<CategorySummary[]>([]);
  const [members, setMembers] = useState<FamilyMemberSummary[]>([]);
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptDetail | null>(null);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedMember, setSelectedMember] = useState(currentMemberId.toString());
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const receiptRequestIdRef = useRef(0);

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

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery.trim());
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await categoryApi.listCategories();
      if (res.success) {
        setCategories(res.data);
      }
    } catch (err) {
      showApiErrorAlert('エラー', err, 'カテゴリーの取得に失敗しました。');
    }
  }, []);

  const fetchMembers = useCallback(async () => {
    try {
      const res = await receiptApi.getFamilyMembers();
      if (res.success) {
        setMembers(res.data);
      }
    } catch (err) {
      showApiErrorAlert('エラー', err, '世帯メンバーの取得に失敗しました。');
    }
  }, []);

  const getListParams = useCallback((cursor?: string) => ({
    ...(selectedMonth ? { month: selectedMonth } : {}),
    memberId: selectedMember,
    ...(debouncedSearchQuery ? { q: debouncedSearchQuery } : {}),
    ...(cursor ? { cursor } : {}),
  }), [selectedMonth, selectedMember, debouncedSearchQuery]);

  const fetchReceipts = useCallback(async (clearSelection = false) => {
    const requestId = ++receiptRequestIdRef.current;
    try {
      setLoading(true);
      setLoadingMore(false);
      if (clearSelection) {
        setReceipts([]);
        setPagination({ items: [], nextCursor: null, hasNext: false });
        setSelectedReceipt(null);
      }
      const res = await receiptApi.listReceipts(getListParams());
      if (requestId !== receiptRequestIdRef.current) return;
      if (res.success) {
        const data = res.data;
        const nextPage = replaceReceiptHistoryPage(data);
        setReceipts(nextPage.items);
        setPagination(nextPage);

        if (!clearSelection && selectedReceipt) {
          const updated = nextPage.items.find((r: ReceiptDetail) => r.id === selectedReceipt.id);
          if (updated) setSelectedReceipt(updated);
        } else if (isWide && nextPage.items.length > 0) {
          setSelectedReceipt(nextPage.items[0]);
        }
      }
    } catch (err) {
      if (requestId === receiptRequestIdRef.current) {
        showApiErrorAlert('エラー', err, '履歴の取得に失敗しました。');
      }
    } finally {
      if (requestId === receiptRequestIdRef.current) setLoading(false);
    }
  }, [getListParams, isWide, selectedReceipt]);

  const loadMore = useCallback(async () => {
    const cursor = pagination.nextCursor;
    if (loadingMore || !pagination.hasNext || !cursor) return;

    const requestId = ++receiptRequestIdRef.current;
    try {
      setLoadingMore(true);
      const res = await receiptApi.listReceipts(getListParams(cursor));
      if (requestId !== receiptRequestIdRef.current) return;
      if (res.success) {
        const nextPage = appendReceiptHistoryPage(pagination, res.data);
        setReceipts(nextPage.items);
        setPagination(nextPage);
      }
    } catch (err) {
      if (requestId === receiptRequestIdRef.current) {
        showApiErrorAlert('エラー', err, '追加の履歴取得に失敗しました。');
      }
    } finally {
      if (requestId === receiptRequestIdRef.current) setLoadingMore(false);
    }
  }, [getListParams, loadingMore, pagination]);

  useEffect(() => {
    fetchCategories();
    fetchMembers();
  }, [fetchCategories, fetchMembers]);

  useEffect(() => {
    void fetchReceipts(true);
  }, [selectedMonth, selectedMember, debouncedSearchQuery]);

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
      showApiErrorAlert('エラー', err, 'カテゴリーの更新に失敗しました。');
    }
  };

  return {
    isWide,
    loading,
    loadingMore,
    receipts,
    hasNext: canLoadMore(pagination),
    categories,
    selectedReceipt,
    setSelectedReceipt,
    selectedMonth,
    setSelectedMonth,
    selectedMember,
    setSelectedMember,
    searchQuery,
    setSearchQuery,
    monthSelectOptions,
    memberSelectOptions,
    baseUrl,
    fetchReceipts,
    loadMore,
    handleCategoryChange,
  };
}
