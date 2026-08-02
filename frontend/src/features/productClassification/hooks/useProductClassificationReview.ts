import { useCallback, useEffect, useMemo, useState } from 'react';
import { categoryApi, receiptApi } from '../../../api';
import type { ProductClassificationCorrectionScope } from '../../../api/receiptApi';
import type {
  CategorySummary,
  ProductClassificationReviewItem,
  ProductTypeStatus,
  ProductTypeSummary,
  ReceiptItemDetail,
} from '../../../api/generated';
import { showApiErrorAlert } from '../../../utils/apiError';
import { getRecentYearMonths, useMonthSelectOptions } from '../../../utils/monthSelectOptions';
import { useIsWideLayout } from '../../../hooks/useIsWideLayout';

const statusOptions: Array<{ label: string; value: ProductTypeStatus }> = [
  { label: '要確認', value: 'needs_review' },
  { label: '未分類', value: 'unclassified' },
  { label: '初期範囲外', value: 'outside_initial_scope' },
];

export function useProductClassificationReview() {
  const isWide = useIsWideLayout();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ProductClassificationReviewItem[]>([]);
  const [categories, setCategories] = useState<CategorySummary[]>([]);
  const [statuses, setStatuses] = useState<ProductTypeStatus[]>(statusOptions.map((option) => option.value));
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [month, setMonth] = useState('');
  const [productTypes, setProductTypes] = useState<ProductTypeSummary[]>([]);
  const [correctionItem, setCorrectionItem] = useState<ReceiptItemDetail | null>(null);
  const [correctionProductTypeId, setCorrectionProductTypeId] = useState<number | null>(null);
  const [correctionScope, setCorrectionScope] = useState<ProductClassificationCorrectionScope>('item_only');
  const [correctionLoading, setCorrectionLoading] = useState(false);

  const monthOptions = useMonthSelectOptions(useMemo(() => getRecentYearMonths(6), []), isWide);
  const categoryOptions = useMemo(
    () => categories.map((category) => ({ label: category.name, value: category.id })),
    [categories]
  );

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await receiptApi.listProductClassificationReviewItems({
        statuses,
        ...(categoryId ? { categoryId } : {}),
        ...(month ? { month } : {}),
      });
      if (res.success) setItems(res.data);
    } catch (error: unknown) {
      showApiErrorAlert('エラー', error, '分類確認一覧の取得に失敗しました。');
    } finally {
      setLoading(false);
    }
  }, [statuses, categoryId, month]);

  useEffect(() => {
    void fetchItems();
  }, [fetchItems]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await categoryApi.listCategories();
        if (res.success) setCategories(res.data);
      } catch (error: unknown) {
        showApiErrorAlert('エラー', error, 'カテゴリーの取得に失敗しました。');
      }
    };
    void fetchCategories();
  }, []);

  const toggleStatus = useCallback((status: ProductTypeStatus) => {
    setStatuses((current) => {
      if (!current.includes(status)) return [...current, status];
      return current.length > 1 ? current.filter((value) => value !== status) : current;
    });
  }, []);

  const openCorrection = useCallback(async (item: ReceiptItemDetail) => {
    setCorrectionItem(item);
    setCorrectionProductTypeId(item.productTypeId);
    setCorrectionScope('item_only');
    if (productTypes.length > 0) return;
    try {
      const res = await receiptApi.listProductTypes();
      if (res.success) setProductTypes(res.data);
    } catch (error: unknown) {
      setCorrectionItem(null);
      showApiErrorAlert('エラー', error, '商品種別の取得に失敗しました。');
    }
  }, [productTypes.length]);

  const closeCorrection = useCallback(() => {
    if (!correctionLoading) setCorrectionItem(null);
  }, [correctionLoading]);

  const saveCorrection = useCallback(async () => {
    if (!correctionItem || !correctionProductTypeId) return;
    setCorrectionLoading(true);
    try {
      await receiptApi.updateItemProductClassification(correctionItem.id, {
        productTypeId: correctionProductTypeId,
        scope: correctionScope,
      });
      setCorrectionItem(null);
      await fetchItems();
    } catch (error: unknown) {
      showApiErrorAlert('エラー', error, '商品種別の修正に失敗しました。');
    } finally {
      setCorrectionLoading(false);
    }
  }, [correctionItem, correctionProductTypeId, correctionScope, fetchItems]);

  return {
    loading, items, statuses, categoryId, month, statusOptions, categoryOptions, monthOptions,
    setCategoryId, setMonth, toggleStatus, fetchItems,
    productTypes, correctionItem, correctionProductTypeId, correctionScope, correctionLoading,
    setCorrectionProductTypeId, setCorrectionScope, openCorrection, closeCorrection, saveCorrection,
  };
}
