import { useCallback, useEffect, useState } from 'react';
import { adminApi, type AdminCostStatRow } from '../../../api';
import { getApiErrorMessage } from '../../../utils/apiError';

export function useAdminStats() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AdminCostStatRow[]>([]);
  const [totalCost, setTotalCost] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      const res = await adminApi.getCostStats();
      const rows = res.data ?? [];
      setStats(rows);
      const total = rows.reduce((sum, item) => sum + item.estimatedCostJpy, 0);
      setTotalCost(total);
    } catch (error: unknown) {
      setErrorMessage(getApiErrorMessage(error, 'コスト統計の取得に失敗しました。'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchStats();
  }, [fetchStats]);

  return {
    loading,
    stats,
    totalCost,
    errorMessage,
  };
}
