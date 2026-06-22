import { useState, useEffect, useCallback } from 'react';
import { receiptApi, statsApi } from '../../../api';
import { showApiErrorAlert } from '../../../utils/apiError';
import { getCurrentYearMonth } from '../../../utils/monthSelectOptions';

export function useHomeDashboard(currentMemberId: number) {
  const [latestReceipt, setLatestReceipt] = useState<{
    storeName?: string;
    date?: string;
    totalAmount?: number;
  } | null>(null);
  const [monthlyTotal, setMonthlyTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const currentMonth = getCurrentYearMonth();
      const [latestRes, statsRes] = await Promise.all([
        receiptApi.getLatestReceipt(currentMemberId),
        statsApi.getMonthlyStats(currentMonth),
      ]);

      if (latestRes.success) {
        setLatestReceipt(latestRes.data);
      }

      if (statsRes.success) {
        const total = statsRes.data.totalAmount || 0;
        setMonthlyTotal(Math.round(total));
      }
    } catch (error) {
      showApiErrorAlert('エラー', error, 'ダッシュボードの取得に失敗しました。');
    } finally {
      setLoading(false);
    }
  }, [currentMemberId]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return { latestReceipt, monthlyTotal, loading, refresh: fetchData };
}
