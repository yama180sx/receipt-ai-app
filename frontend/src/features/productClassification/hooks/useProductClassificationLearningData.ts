import { useCallback, useEffect, useMemo, useState } from 'react';
import { receiptApi } from '../../../api';
import type { ProductClassificationLearningData, ProductClassificationLearningDataType } from '../../../api/generated';
import { showApiErrorAlert } from '../../../utils/apiError';

export function useProductClassificationLearningData() {
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<ProductClassificationLearningData[]>([]);
  const [type, setType] = useState<ProductClassificationLearningDataType | 'all'>('all');
  const [deactivatingId, setDeactivatingId] = useState<number | null>(null);
  const [pendingRecord, setPendingRecord] = useState<ProductClassificationLearningData | null>(null);
  const [reason, setReason] = useState('');

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const response = await receiptApi.listProductClassificationLearningData();
      if (response.success) setRecords(response.data);
    } catch (error: unknown) {
      showApiErrorAlert('エラー', error, '分類学習データの取得に失敗しました。');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchRecords(); }, [fetchRecords]);

  const visibleRecords = useMemo(
    () => records.filter((record) => type === 'all' || record.type === type),
    [records, type]
  );

  const deactivate = useCallback((record: ProductClassificationLearningData) => {
    if (record.type === 'history' || !record.isActive) return;
    setPendingRecord(record);
    setReason('');
  }, []);

  const closeDeactivateModal = useCallback(() => {
    if (!deactivatingId) setPendingRecord(null);
  }, [deactivatingId]);

  const confirmDeactivate = useCallback(async () => {
    if (!pendingRecord || pendingRecord.type === 'history' || !reason.trim()) return;
    const deactivatableType: 'household_dictionary' | 'alias' = pendingRecord.type;
    setDeactivatingId(pendingRecord.id);
    try {
      await receiptApi.deactivateProductClassificationLearningData(deactivatableType, pendingRecord.id, reason.trim());
      setPendingRecord(null);
      await fetchRecords();
    } catch (error: unknown) {
      showApiErrorAlert('エラー', error, '学習データの無効化に失敗しました。');
    } finally {
      setDeactivatingId(null);
    }
  }, [fetchRecords, pendingRecord, reason]);

  return { loading, records: visibleRecords, type, setType, deactivatingId, deactivate, fetchRecords, pendingRecord, reason, setReason, closeDeactivateModal, confirmDeactivate };
}
