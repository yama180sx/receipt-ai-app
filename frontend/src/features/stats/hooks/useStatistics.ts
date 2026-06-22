import { useCallback, useEffect, useMemo, useState } from 'react';
import { useWindowDimensions } from 'react-native';
import { categoryApi, receiptApi, statsApi } from '../../../api';
import { useIsWideLayout } from '../../../hooks/useIsWideLayout';
import {
  mapAdvancedStatsResponse,
  mapCategoryList,
  mapMonthlyStatsResponse,
} from '../../../mappers/statsMapper';
import { theme } from '../../../theme';
import type {
  AdvancedStatsViewModel,
  MonthlyStatsViewModel,
  StatsCategoryOption,
} from '../../../types/stats';
import { showAlert } from '../../../utils/alertMessage';
import { getApiErrorMessage } from '../../../utils/apiError';
import { getCurrentYearMonth, getRecentYearMonths, useMonthSelectOptions } from '../../../utils/monthSelectOptions';
import { useReceiptImageSource } from '../../../utils/receiptImageSource';

export type StatsChartSlice = {
  name: string;
  population: number;
  color: string;
  legendFontColor: string;
  legendFontSize: number;
};

export function useStatistics(currentMemberId: number) {
  const { width: windowWidth } = useWindowDimensions();
  const isWide = useIsWideLayout();

  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentYearMonth);
  const [data, setData] = useState<MonthlyStatsViewModel | null>(null);
  const [advancedData, setAdvancedData] = useState<AdvancedStatsViewModel | null>(null);
  const [allCategories, setAllCategories] = useState<StatsCategoryOption[]>([]);
  const [isMainModalVisible, setMainModalVisible] = useState(false);

  const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';
  const BASE_URL = API_URL.replace(/\/api\/?$/, '');
  const latestReceiptImageSource = useReceiptImageSource(data?.latestReceipt?.imagePath);

  const monthOptions = useMemo(() => getRecentYearMonths(12), []);
  const monthSelectOptions = useMonthSelectOptions(monthOptions, isWide);

  const fetchData = useCallback(async () => {
    if (!currentMemberId) return;
    try {
      setLoading(true);
      const [statsRes, advRes, catRes] = await Promise.all([
        statsApi.getMonthlyStats(selectedMonth),
        statsApi.getAdvancedStats(),
        categoryApi.listCategories(),
      ]);

      if (statsRes.success) {
        setData(mapMonthlyStatsResponse(statsRes.data, selectedMonth));
      }
      if (advRes.success) setAdvancedData(mapAdvancedStatsResponse(advRes.data));
      if (catRes.success) setAllCategories(mapCategoryList(catRes.data));
    } catch (error: unknown) {
      console.error('[DEBUG-STATS] Fetch Error:', error);
      showAlert('エラー', getApiErrorMessage(error, 'データの取得に失敗しました'));
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, currentMemberId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCategoryChange = async (itemId: number, categoryId: number | null) => {
    if (!categoryId) return;
    try {
      await receiptApi.updateItemCategory(itemId, Number(categoryId));
      await fetchData();
    } catch (error) {
      showAlert('エラー', getApiErrorMessage(error, 'カテゴリーの更新に失敗しました'));
    }
  };

  const chartData = useMemo((): StatsChartSlice[] => {
    if (!data?.stats || !Array.isArray(data.stats)) return [];
    return data.stats
      .map((s) => {
        const val = Math.round(Number(s.totalAmount) || 0);
        return {
          name: s.categoryName || '未分類',
          population: val,
          color: s.color || theme.colors.secondary,
          legendFontColor: theme.colors.text.main,
          legendFontSize: 12,
        };
      })
      .filter((s) => s.population > 0);
  }, [data?.stats]);

  const chartWidth = isWide ? 400 : windowWidth - 60;

  return {
    loading,
    data,
    advancedData,
    allCategories,
    selectedMonth,
    setSelectedMonth,
    monthSelectOptions,
    isMainModalVisible,
    setMainModalVisible,
    chartData,
    chartWidth,
    latestReceiptImageSource,
    BASE_URL,
    isWide,
    fetchData,
    handleCategoryChange,
  };
}

export type StatisticsFlow = ReturnType<typeof useStatistics>;
