import { useEffect, useMemo, useState } from 'react';
import { useWindowDimensions } from 'react-native';
import { receiptApi } from '../../../api/receiptApi';
import type { ProductClassificationCorrectionScope } from '../../../api/receiptApi';
import { useIsWideLayout } from '../../../hooks/useIsWideLayout';
import type { CategorySummary, ProductTypeSummary, ReceiptDetail, ReceiptItemDetail } from '../../../types/receipt';
import { getApiErrorMessage } from '../../../utils/apiError';
import { showAlert } from '../../../utils/alertMessage';
import { useReceiptImageSource } from '../../../utils/receiptImageSource';

type UseReceiptDetailOptions = {
  receipt: ReceiptDetail | null | undefined;
  categories: CategorySummary[];
  fullWidth?: boolean;
  onSaveSuccess?: () => void;
};

export function useReceiptDetail({
  receipt,
  categories,
  fullWidth = true,
  onSaveSuccess,
}: UseReceiptDetailOptions) {
  const { width: windowWidth } = useWindowDimensions();
  const effectiveWidth = fullWidth ? windowWidth : windowWidth - 350;
  const isWide = useIsWideLayout({ width: effectiveWidth });

  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editData, setEditData] = useState<ReceiptDetail | null>(null);
  const [productTypes, setProductTypes] = useState<ProductTypeSummary[]>([]);
  const [correctionItem, setCorrectionItem] = useState<ReceiptItemDetail | null>(null);
  const [correctionProductTypeId, setCorrectionProductTypeId] = useState<number | null>(null);
  const [correctionScope, setCorrectionScope] = useState<ProductClassificationCorrectionScope>('item_only');
  const [classificationName, setClassificationName] = useState('');
  const [correctionLoading, setCorrectionLoading] = useState(false);

  const cacheKey = useMemo(() => Date.now(), []);
  const imageSource = useReceiptImageSource(receipt?.imagePath);
  const imageSourceWithCache = useMemo(() => {
    if (!imageSource) return null;
    if (!imageSource.uri.startsWith('http')) return imageSource;
    return { ...imageSource, uri: `${imageSource.uri}?v=${cacheKey}` };
  }, [imageSource, cacheKey]);

  const categorySelectOptions = useMemo(
    () => categories.map((c) => ({ label: c.name, value: c.id as number })),
    [categories]
  );

  useEffect(() => {
    if (receipt) {
      const data = JSON.parse(JSON.stringify(receipt)) as ReceiptDetail;
      data.taxAmount = data.taxAmount ?? 0;
      setEditData(data);
    }
    setIsEditing(false);
  }, [receipt]);

  const displayTotal = useMemo(() => {
    if (!editData || !receipt) return 0;
    const items = isEditing ? editData.items : receipt.items;
    const tax = isEditing ? parseFloat(String(editData.taxAmount)) || 0 : receipt.taxAmount || 0;

    const itemsSum = items.reduce((s: number, i: ReceiptItemDetail) => {
      const p = parseFloat(String(i.price)) || 0;
      const q = parseFloat(String(i.quantity)) || 0;
      return s + p * q;
    }, 0);

    return Math.round(itemsSum + tax);
  }, [isEditing, editData, receipt]);

  const updateEditField = (key: keyof ReceiptDetail, value: ReceiptDetail[keyof ReceiptDetail] | string) => {
    if (!editData) return;
    setEditData({ ...editData, [key]: value } as ReceiptDetail);
  };

  const updateEditItem = (
    index: number,
    key: keyof ReceiptItemDetail,
    value: ReceiptItemDetail[keyof ReceiptItemDetail] | string
  ) => {
    if (!editData) return;
    const newItems = [...editData.items];
    newItems[index] = { ...newItems[index], [key]: value } as ReceiptItemDetail;
    setEditData({ ...editData, items: newItems });
  };

  const handleSave = async () => {
    if (!receipt || !editData) return;
    setLoading(true);
    try {
      const payload = {
        storeName: editData.storeName,
        date: editData.date,
        taxAmount: parseFloat(String(editData.taxAmount)) || 0,
        totalAmount: displayTotal,
        items: editData.items.map((item) => ({
          ...item,
          price: parseFloat(String(item.price)) || 0,
          quantity: parseFloat(String(item.quantity)) || 0,
          categoryId: item.categoryId ? Number(item.categoryId) : null,
        })),
      };

      const res = await receiptApi.updateReceipt(receipt.id, payload);
      if (res.success) {
        showAlert('成功', '変更を保存しました。');
        setIsEditing(false);
        onSaveSuccess?.();
      }
    } catch (err: unknown) {
      console.error('Update failed', getApiErrorMessage(err));
      showAlert('エラー', '保存に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  const openProductClassificationCorrection = async (item: ReceiptItemDetail) => {
    setCorrectionItem(item);
    setCorrectionProductTypeId(item.productTypeId);
    setCorrectionScope('item_only');
    setClassificationName('');
    if (productTypes.length > 0) return;

    try {
      const res = await receiptApi.listProductTypes();
      if (res.success) setProductTypes(res.data);
    } catch (err: unknown) {
      console.error('Failed to load product types', getApiErrorMessage(err));
      showAlert('エラー', '商品種別の取得に失敗しました。');
      setCorrectionItem(null);
    }
  };

  const closeProductClassificationCorrection = () => {
    if (!correctionLoading) setCorrectionItem(null);
  };

  const saveProductClassificationCorrection = async () => {
    if (!correctionItem || !correctionProductTypeId) return;
    setCorrectionLoading(true);
    try {
      const res = await receiptApi.updateItemProductClassification(correctionItem.id, {
        productTypeId: correctionProductTypeId,
        scope: correctionScope,
        ...(correctionScope === 'same_classification_name' ? { classificationName } : {}),
      });
      if (res.success) {
        showAlert('成功', '商品種別を修正しました。');
        setCorrectionItem(null);
        onSaveSuccess?.();
      }
    } catch (err: unknown) {
      console.error('Failed to correct product classification', getApiErrorMessage(err));
      showAlert('エラー', '商品種別の修正に失敗しました。');
    } finally {
      setCorrectionLoading(false);
    }
  };

  return {
    isWide,
    isEditing,
    setIsEditing,
    loading,
    editData,
    receipt,
    imageSourceWithCache,
    categorySelectOptions,
    displayTotal,
    updateEditField,
    updateEditItem,
    handleSave,
    productTypes,
    correctionItem,
    correctionProductTypeId,
    correctionScope,
    classificationName,
    correctionLoading,
    setCorrectionProductTypeId,
    setCorrectionScope,
    setClassificationName,
    openProductClassificationCorrection,
    closeProductClassificationCorrection,
    saveProductClassificationCorrection,
  };
}

export type ReceiptDetailFlow = ReturnType<typeof useReceiptDetail>;
