import { useCallback, useEffect, useMemo, useState } from 'react';
import { categoryApi, receiptApi } from '../../../api';
import type {
  CategorySummary,
  ProductClassificationReviewItem,
  ProductTypeStatus,
  ProductTypeSummary,
} from '../../../api/generated';
import type {
  ListProductClassificationReviewParams,
  ProductClassificationCorrectionScope,
} from '../../../api/receiptApi';
import { showApiErrorAlert } from '../../../utils/apiError';

type ReviewStatus = Exclude<ProductTypeStatus, 'classified' | 'not_applicable'>;

export function useProductClassificationReview() {
  const [items, setItems] = useState<ProductClassificationReviewItem[]>([]);
  const [categories, setCategories] = useState<CategorySummary[]>([]);
  const [productTypes, setProductTypes] = useState<ProductTypeSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<ReviewStatus | ''>('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [draftFrom, setDraftFrom] = useState('');
  const [draftTo, setDraftTo] = useState('');
  const [correctionItem, setCorrectionItem] =
    useState<ProductClassificationReviewItem | null>(null);
  const [selectedProductTypeId, setSelectedProductTypeId] = useState<number | null>(null);
  const [scope, setScope] = useState<ProductClassificationCorrectionScope>('item_only');
  const [classificationName, setClassificationName] = useState('');

  const params = useMemo<ListProductClassificationReviewParams>(
    () => ({
      ...(status ? { status } : {}),
      ...(categoryId ? { categoryId } : {}),
      ...(from ? { from } : {}),
      ...(to ? { to } : {}),
      page,
      limit: 20,
    }),
    [categoryId, from, page, status, to]
  );

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      const response = await receiptApi.listProductClassificationReviewItems(params);
      setItems(response.data.items);
      setTotal(response.data.total);
      setTotalPages(response.data.totalPages);
    } catch (error) {
      showApiErrorAlert('エラー', error, '商品分類の要確認明細を取得できませんでした。');
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    void Promise.all([
      categoryApi.listCategories().then((response) => setCategories(response.data)),
      receiptApi.listProductTypes().then((response) => setProductTypes(response.data)),
    ]).catch((error) => {
      showApiErrorAlert('エラー', error, '絞り込み・商品種別の選択肢を取得できませんでした。');
    });
  }, []);

  useEffect(() => {
    void fetchItems();
  }, [fetchItems]);

  const updateFilter = <T,>(setter: (value: T) => void) => (value: T) => {
    setPage(1);
    setter(value);
  };

  const openCorrection = (item: ProductClassificationReviewItem) => {
    setCorrectionItem(item);
    setSelectedProductTypeId(
      item.productTypeId ?? item.candidates[0]?.productType.id ?? null
    );
    setScope('item_only');
    setClassificationName(item.name);
  };

  const closeCorrection = () => {
    if (!saving) setCorrectionItem(null);
  };

  const applyDateRange = () => {
    setPage(1);
    setFrom(draftFrom.trim());
    setTo(draftTo.trim());
  };

  const saveCorrection = async () => {
    if (!correctionItem || !selectedProductTypeId) return;
    try {
      setSaving(true);
      await receiptApi.updateItemProductClassification(correctionItem.id, {
        productTypeId: selectedProductTypeId,
        scope,
        ...(scope === 'same_classification_name'
          ? { classificationName: classificationName.trim() }
          : {}),
      });
      setCorrectionItem(null);
      await fetchItems();
    } catch (error) {
      showApiErrorAlert('エラー', error, '商品種別を更新できませんでした。');
    } finally {
      setSaving(false);
    }
  };

  return {
    items,
    categories,
    productTypes,
    loading,
    saving,
    total,
    totalPages,
    page,
    setPage,
    status,
    setStatus: updateFilter(setStatus),
    categoryId,
    setCategoryId: updateFilter(setCategoryId),
    from,
    draftFrom,
    setDraftFrom,
    to,
    draftTo,
    setDraftTo,
    applyDateRange,
    correctionItem,
    selectedProductTypeId,
    setSelectedProductTypeId,
    scope,
    setScope,
    classificationName,
    setClassificationName,
    openCorrection,
    closeCorrection,
    saveCorrection,
    refresh: fetchItems,
  };
}
