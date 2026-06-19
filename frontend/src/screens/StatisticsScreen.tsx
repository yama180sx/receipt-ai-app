import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  ActivityIndicator, 
  Image, 
  TouchableOpacity, 
  Alert, 
  FlatList, 
  useWindowDimensions, 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PieChart } from 'react-native-chart-kit';
import apiClient from '../utils/apiClient';
import { getCurrentYearMonth, getRecentYearMonths, useMonthSelectOptions } from '../utils/monthSelectOptions';
import { AppBackButton, AppModal, AppSelect } from '../components/ui';
import { theme } from '../theme';
import { useIsWideLayout } from '../hooks/useIsWideLayout';
import { ReceiptDetailComponent } from '../components/ReceiptDetailComponent';
import type { ReceiptDetail } from '../types/receipt';
import { useReceiptImageSource } from '../utils/receiptImageSource';

// --- interface 定義 ---
interface Category { id: number; name: string; color: string; }
interface StatItem { categoryId: number | null; categoryName: string; totalAmount: number | string; color: string; }
interface ReceiptItem { id: number; name: string; price: number; quantity: number; categoryId: number; category?: { name: string; color: string }; }

// [Issue #71] taxAmount を追加
interface ReceiptInfo { 
  id: number; 
  imagePath: string | null; 
  storeName: string; 
  totalAmount: number; 
  taxAmount?: number; 
  items: ReceiptItem[]; 
  date?: string; 
}

interface MonthlyData { 
  month: string; 
  totalAmount: number; 
  prevTotal: number; 
  diffAmount: number; 
  diffPercentage: number; 
  stats: StatItem[]; 
  latestReceipt: ReceiptInfo | null; 
}

interface TrendData { period: string; total: number; prev_total: number | null; }
interface ParetoData { name: string; amount: number; ratio: number; cumulative_ratio: number; }
interface AdvancedStats { trend: TrendData[]; pareto: ParetoData[]; }

interface StatisticsScreenProps { 
  currentMemberId: number; 
  onBack: () => void;
}

/**
 * [Issue #67 / #71] 家計統計画面
 * - 消費税(taxAmount)を考慮した集計表示への対応
 * - 最新レシートプレビューでの税額表示追加
 */
export const StatisticsScreen: React.FC<StatisticsScreenProps> = ({ currentMemberId, onBack }) => {
  const { width: windowWidth } = useWindowDimensions();
  const isWide = useIsWideLayout();

  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentYearMonth);
  const [data, setData] = useState<MonthlyData | null>(null);
  const [advancedData, setAdvancedData] = useState<AdvancedStats | null>(null);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  
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
      const headers = { 'x-member-id': currentMemberId.toString() };
      const [statsRes, advRes, catRes] = await Promise.all([
        apiClient.get(`/stats/monthly`, { params: { month: selectedMonth }, headers }),
        apiClient.get(`/stats/advanced`, { headers }),
        apiClient.get('/categories', { headers })
      ]);

      if (statsRes.data?.success) {
        const raw = statsRes.data.data;
        if (Array.isArray(raw)) {
          const target = raw.find(item => item.month === selectedMonth) || raw[0];
          setData({
            month: target?.month || selectedMonth,
            totalAmount: Number(target?.total || 0),
            prevTotal: 0, diffAmount: 0, diffPercentage: 0,
            stats: target?.stats || [], 
            latestReceipt: target?.latestReceipt || null
          });
        } else {
          setData(raw);
        }
      }
      if (advRes.data?.success) setAdvancedData(advRes.data.data);
      if (catRes.data?.success) setAllCategories(catRes.data.data);
    } catch (error: any) {
      console.error('[DEBUG-STATS] Fetch Error:', error);
      Alert.alert("エラー", "データの取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, currentMemberId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCategoryChange = async (itemId: number, categoryId: number | null) => {
    if (!categoryId) return;
    try {
      await apiClient.patch(`/receipts/items/${itemId}`, 
        { categoryId: Number(categoryId) }, 
        { headers: { 'x-member-id': currentMemberId.toString() } }
      );
      await fetchData(); 
    } catch (error) {
      Alert.alert("エラー", "カテゴリーの更新に失敗しました");
    }
  };

  /**
   * [Issue #71] チャートデータの生成
   * 基本的にバックエンドの集計ロジック（ID:9に消費税を集約）に依存するが、
   * フロントエンドでも数値の丸め処理を確実に実施。
   */
  const chartData = useMemo(() => {
    if (!data?.stats || !Array.isArray(data.stats)) return [];
    return data.stats
      .map(s => {
        const val = Math.round(Number(s.totalAmount) || 0);
        return {
          name: s.categoryName || '未分類',
          population: val,
          color: s.color || theme.colors.secondary,
          legendFontColor: theme.colors.text.main,
          legendFontSize: 12,
        };
      })
      .filter(s => s.population > 0);
  }, [data?.stats]);

  const chartWidth = isWide ? 400 : windowWidth - 60;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <AppBackButton onPress={onBack} />
        <Text style={styles.headerTitle}>家計分析レポート</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.topInfo}>
          <Text style={styles.headerSubtitle}>{currentMemberId === 1 ? 'PERSONAL REPORT' : 'FAMILY REPORT'}</Text>
          <View style={[styles.monthPickerContainer, isWide ? styles.monthPickerContainerWide : styles.monthPickerContainerMobile]}>
            <AppSelect<string>
              selectedValue={selectedMonth}
              onValueChange={setSelectedMonth}
              options={monthSelectOptions}
              includePlaceholder={false}
            />
          </View>
        </View>
        
        {loading && !data ? (
          <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 50 }} />
        ) : (
          <View style={isWide ? styles.dashboardGrid : null}>
            <View style={isWide ? styles.leftColumn : null}>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>当月合計支出（税込）</Text>
                <Text style={styles.totalValue}>
                  ¥{Math.round(Number(data?.totalAmount) || 0).toLocaleString()}
                </Text>
                <View style={styles.comparisonRow}>
                  <Text style={styles.comparisonLabel}>前月比:</Text>
                  <Text style={[styles.diffValue, { color: (data?.diffAmount || 0) > 0 ? theme.colors.error : theme.colors.success }]}>
                    {(data?.diffAmount || 0) > 0 ? '▲' : '▼'} ¥{Math.abs(Math.round(Number(data?.diffAmount) || 0)).toLocaleString()} ({data?.diffPercentage || 0}%)
                  </Text>
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>支出内訳</Text>
                <View style={styles.chartCard}>
                  {chartData.length > 0 ? (
                    <PieChart
                      data={chartData}
                      width={chartWidth}
                      height={220}
                      chartConfig={{ color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})` }}
                      accessor={"population"}
                      backgroundColor={"transparent"}
                      paddingLeft={"15"}
                      absolute
                    />
                  ) : <Text style={styles.noDataText}>カテゴリー別データがありません</Text>}
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>最新の解析レシート</Text>
                {data?.latestReceipt?.imagePath && latestReceiptImageSource ? (
                  <TouchableOpacity style={styles.receiptPreviewCard} onPress={() => setMainModalVisible(true)}>
                    <Image source={latestReceiptImageSource} style={styles.receiptImage} resizeMode="cover" />
                    <View style={styles.receiptInfoOverlay}>
                      <View style={{ flex: 1, marginRight: 10 }}>
                        <Text style={styles.receiptStoreName} numberOfLines={1}>
                          {data.latestReceipt.storeName || '店名不明'}
                        </Text>
                        {/* [Issue #71] 税額のサブ表示 */}
                        {data.latestReceipt.taxAmount ? (
                          <Text style={styles.taxSubText}>内、消費税 ¥{data.latestReceipt.taxAmount.toLocaleString()}</Text>
                        ) : null}
                      </View>
                      <Text style={styles.receiptAmount}>
                        ¥{Math.round(Number(data.latestReceipt.totalAmount) || 0).toLocaleString()}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ) : <View style={styles.noImageBox}><Text style={styles.noDataText}>画像なし</Text></View>}
              </View>
            </View>

            <View style={isWide ? styles.rightColumn : null}>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>月次推移 (MoM Trend)</Text>
                <View style={styles.statsCard}>
                  {advancedData?.trend.map((t, i) => {
                    const diff = t.prev_total ? t.total - t.prev_total : 0;
                    return (
                      <View key={i} style={styles.trendRow}>
                        <Text style={styles.trendPeriod}>{t.period}</Text>
                        <Text style={styles.trendAmount}>¥{Math.round(Number(t.total) || 0).toLocaleString()}</Text>
                        <Text style={[styles.trendDiff, { color: diff > 0 ? theme.colors.error : theme.colors.success }]}>
                          {t.prev_total !== null ? `${diff > 0 ? '+' : ''}${Math.round(diff).toLocaleString()}` : '-'}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>費目別分析 (Pareto 80/20)</Text>
                <View style={styles.statsCard}>
                  {advancedData?.pareto.map((p, i) => (
                    <View key={i} style={styles.paretoWrapper}>
                      <View style={styles.paretoTextRow}>
                        <Text style={styles.paretoName}>{p.name}</Text>
                        <Text style={styles.paretoValue}>¥{Math.round(Number(p.amount) || 0).toLocaleString()} ({p.ratio}%)</Text>
                      </View>
                      <View style={styles.paretoBarContainer}>
                        <View style={[
                          styles.paretoBar, 
                          { width: `${p.ratio}%`, backgroundColor: p.cumulative_ratio <= 80 ? theme.colors.primary : theme.colors.semantic.chart.barInactive }
                        ]} />
                        <Text style={styles.cumText}>{p.cumulative_ratio}%</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      <AppModal
        visible={isMainModalVisible}
        onRequestClose={() => setMainModalVisible(false)}
        variant="sheet"
        sheetPresentation={isWide ? 'wide' : 'fullscreen'}
        title="解析レシート詳細"
      >
        <ReceiptDetailComponent
          receipt={data?.latestReceipt as ReceiptDetail | null | undefined}
          categories={allCategories}
          onCategoryChange={handleCategoryChange}
          baseUrl={BASE_URL}
          fullWidth={true}
          onSaveSuccess={fetchData}
        />
      </AppModal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  scrollContent: { padding: 20 },
  topInfo: { marginBottom: 15 },
  headerSubtitle: { fontSize: 10, color: theme.colors.text.muted, letterSpacing: 1 },
  monthPickerContainer: { marginTop: 8, justifyContent: 'center' },
  monthPickerContainerMobile: { width: '100%', alignSelf: 'stretch' },
  monthPickerContainerWide: { width: 180 },
  dashboardGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  leftColumn: { flex: 1.2, marginRight: 20 },
  rightColumn: { flex: 1 },
  summaryCard: { backgroundColor: theme.colors.surface, padding: 20, borderRadius: 15, marginBottom: 25, alignItems: 'center', borderWidth: 1, borderColor: theme.colors.border, elevation: 3 },
  summaryLabel: { fontSize: 12, color: theme.colors.text.muted },
  totalValue: { fontSize: 36, fontWeight: 'bold', color: theme.colors.primary, marginVertical: 4 },
  comparisonRow: { flexDirection: 'row', alignItems: 'center' },
  comparisonLabel: { fontSize: 12, marginRight: 8 },
  diffValue: { fontWeight: '700', fontSize: 16 },
  section: { marginBottom: 25 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 15, borderLeftWidth: 4, borderLeftColor: theme.colors.primary, paddingLeft: 8 },
  statsCard: { backgroundColor: theme.colors.surface, borderRadius: 12, padding: 15, borderWidth: 1, borderColor: theme.colors.border },
  trendRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.colors.background },
  trendPeriod: { flex: 1, fontWeight: '700' },
  trendAmount: { flex: 1, textAlign: 'right' },
  trendDiff: { flex: 1, textAlign: 'right', fontSize: 12, fontWeight: '600' },
  paretoWrapper: { marginBottom: 12 },
  paretoTextRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  paretoName: { fontWeight: '700', fontSize: 14 },
  paretoValue: { fontSize: 12, color: theme.colors.text.muted },
  paretoBarContainer: { height: 16, backgroundColor: theme.colors.semantic.chart.barBg, borderRadius: 8, flexDirection: 'row', alignItems: 'center', overflow: 'hidden' },
  paretoBar: { height: '100%' },
  cumText: { fontSize: 10, position: 'absolute', right: 8, fontWeight: '700', color: theme.colors.text.main },
  chartCard: { backgroundColor: theme.colors.surface, borderRadius: 12, padding: 15, alignItems: 'center', borderWidth: 1, borderColor: theme.colors.border, minHeight: 220, justifyContent: 'center' },
  noDataText: { fontSize: 12, color: theme.colors.text.muted },
  receiptPreviewCard: { backgroundColor: theme.colors.surface, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: theme.colors.border },
  receiptImage: { width: '100%', height: 160, backgroundColor: theme.colors.border },
  receiptInfoOverlay: { padding: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 60 },
  receiptStoreName: { fontWeight: '700', color: theme.colors.text.main },
  receiptAmount: { fontSize: 18, fontWeight: 'bold', color: theme.colors.primary, minWidth: 80, textAlign: 'right' },
  taxSubText: { fontSize: 11, color: theme.colors.text.muted, marginTop: 2 },
  noImageBox: { height: 100, backgroundColor: theme.colors.border, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
});