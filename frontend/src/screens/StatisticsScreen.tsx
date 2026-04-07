import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions, ScrollView, ActivityIndicator, Image, TouchableOpacity, Modal, Alert, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PieChart } from 'react-native-chart-kit';
import { Picker } from '@react-native-picker/picker';
import apiClient from '../utils/apiClient';
import { theme } from '../theme';

const screenWidth = Dimensions.get('window').width;

// --- interface 定義 ---
interface Category { id: number; name: string; color: string; }
interface StatItem { categoryId: number | null; categoryName: string; totalAmount: number; color: string; }
interface ReceiptItem { id: number; name: string; price: number; categoryId: number; category?: { name: string; color: string }; }
interface ReceiptInfo { id: number; imagePath: string | null; storeName: string; totalAmount: number; items: ReceiptItem[]; }
interface MonthlyData { month: string; totalAmount: number; prevTotal: number; diffAmount: number; diffPercentage: number; stats: StatItem[]; latestReceipt: ReceiptInfo | null; }

interface TrendData { period: string; total: number; prev_total: number | null; }
interface ParetoData { name: string; amount: number; ratio: number; cumulative_ratio: number; }
interface AdvancedStats { trend: TrendData[]; pareto: ParetoData[]; }

interface StatisticsScreenProps { 
  currentMemberId: number; 
  onBack: () => void;
}

export const StatisticsScreen: React.FC<StatisticsScreenProps> = ({ currentMemberId, onBack }) => {
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [data, setData] = useState<MonthlyData | null>(null);
  const [advancedData, setAdvancedData] = useState<AdvancedStats | null>(null);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  
  const [isMainModalVisible, setMainModalVisible] = useState(false);
  const [isPickerVisible, setPickerVisible] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);

  const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';
  const BASE_URL = API_URL.replace(/\/api\/?$/, '');

  const monthOptions = useMemo(() => {
    return Array.from({ length: 12 }).map((_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      return d.toISOString().slice(0, 7);
    });
  }, []);

  /**
   * [Issue #44 & #45] データ取得
   * すべてのリクエストに x-member-id ヘッダーを付与し、世帯分離を徹底します。
   */
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const headers = { 'x-member-id': currentMemberId.toString() };

      const [statsRes, advRes, catRes] = await Promise.all([
        apiClient.get(`/stats/monthly`, { 
          params: { month: selectedMonth, memberId: currentMemberId },
          headers 
        }),
        apiClient.get(`/stats/advanced`, { 
          params: { memberId: currentMemberId },
          headers 
        }),
        apiClient.get('/categories', { headers })
      ]);

      if (statsRes.data?.success) setData(statsRes.data.data);
      if (advRes.data?.success) setAdvancedData(advRes.data.data);
      if (catRes.data?.success) setAllCategories(catRes.data.data);

    } catch (error: any) {
      console.error('Fetch error:', error);
      Alert.alert("エラー", "データの取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, currentMemberId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /**
   * カテゴリー更新処理
   */
  const handleUpdateCategory = async (categoryId: number) => {
    if (!selectedItemId) return;
    try {
      await apiClient.patch(`/receipt-items/${selectedItemId}`, 
        { categoryId },
        { headers: { 'x-member-id': currentMemberId.toString() } }
      );
      setPickerVisible(false);
      await fetchData(); // 再フェッチしてグラフを更新
      Alert.alert("完了", "カテゴリーを更新しました");
    } catch (error) {
      Alert.alert("エラー", "更新に失敗しました");
    }
  };

  const chartData = (data?.stats || [])
    .filter(s => (s.totalAmount ?? 0) > 0)
    .map(s => ({
      name: s.categoryName,
      population: s.totalAmount,
      color: s.color || theme.colors.secondary,
      legendFontColor: theme.colors.text.main,
      legendFontSize: 12,
    }));

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
          <Text style={styles.backButton}>← 戻る</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>家計分析レポート</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        <View style={styles.topInfo}>
          <Text style={styles.headerSubtitle}>{currentMemberId === 1 ? 'PERSONAL REPORT' : 'FAMILY REPORT'}</Text>
          <View style={styles.monthPickerContainer}>
            <Picker selectedValue={selectedMonth} onValueChange={(val) => setSelectedMonth(val)} style={styles.monthPicker}>
              {monthOptions.map(m => (
                <Picker.Item key={m} label={`${m.split('-')[0]}年${m.split('-')[1]}月`} value={m} />
              ))}
            </Picker>
          </View>
        </View>
        
        {loading && !data ? (
          <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 50 }} />
        ) : (
          <>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>当月合計支出</Text>
              <Text style={styles.totalValue}>¥{(data?.totalAmount || 0).toLocaleString()}</Text>
              <View style={styles.comparisonRow}>
                <Text style={styles.comparisonLabel}>前月比:</Text>
                <Text style={[styles.diffValue, { color: (data?.diffAmount || 0) > 0 ? theme.colors.error : theme.colors.success }]}>
                  {(data?.diffAmount || 0) > 0 ? '▲' : '▼'} ¥{Math.abs(data?.diffAmount || 0).toLocaleString()} ({data?.diffPercentage || 0}%)
                </Text>
              </View>
            </View>

            {/* --- 2. [Issue #44] トレンド分析 --- */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>月次推移 (MoM Trend)</Text>
              <View style={styles.statsCard}>
                {advancedData?.trend.map((t, i) => {
                  const diff = t.prev_total ? t.total - t.prev_total : 0;
                  return (
                    <View key={i} style={styles.trendRow}>
                      <Text style={styles.trendPeriod}>{t.period}</Text>
                      <Text style={styles.trendAmount}>¥{t.total.toLocaleString()}</Text>
                      <Text style={[styles.trendDiff, { color: diff > 0 ? theme.colors.error : theme.colors.success }]}>
                        {t.prev_total !== null ? `${diff > 0 ? '+' : ''}${diff.toLocaleString()}` : '-'}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* --- 3. [Issue #44] パレート分析 --- */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>費目別パレート分析 (Pareto)</Text>
              <View style={styles.statsCard}>
                {advancedData?.pareto.map((p, i) => (
                  <View key={i} style={styles.paretoWrapper}>
                    <View style={styles.paretoTextRow}>
                      <Text style={styles.paretoName}>{p.name}</Text>
                      <Text style={styles.paretoValue}>¥{p.amount.toLocaleString()} ({p.ratio}%)</Text>
                    </View>
                    <View style={styles.paretoBarContainer}>
                      <View style={[
                        styles.paretoBar, 
                        { width: `${p.ratio}%`, backgroundColor: p.cumulative_ratio <= 80 ? theme.colors.primary : '#CED4DA' }
                      ]} />
                      <Text style={styles.cumText}>{p.cumulative_ratio}%</Text>
                    </View>
                  </View>
                ))}
                <Text style={styles.paretoNote}>※ 青色の費目が全体支出の80%を占める主要項目です</Text>
              </View>
            </View>

            {/* --- 4. 円グラフ --- */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>支出内訳</Text>
              <View style={styles.chartCard}>
                {chartData.length > 0 ? (
                  <PieChart
                    data={chartData}
                    width={screenWidth - 60}
                    height={200}
                    chartConfig={{ color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})` }}
                    accessor={"population"}
                    backgroundColor={"transparent"}
                    paddingLeft={"15"}
                    absolute
                  />
                ) : <Text style={styles.noDataText}>データなし</Text>}
              </View>
            </View>

            {/* --- 5. 最新レシート --- */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>最新の解析レシート</Text>
              {data?.latestReceipt?.imagePath ? (
                <TouchableOpacity style={styles.receiptPreviewCard} onPress={() => setMainModalVisible(true)}>
                  <Image source={{ uri: `${BASE_URL}/${data.latestReceipt.imagePath}` }} style={styles.receiptImage} resizeMode="cover" />
                  <View style={styles.receiptInfoOverlay}>
                    <Text style={styles.receiptStoreName}>{data.latestReceipt.storeName}</Text>
                    <Text style={styles.receiptAmount}>¥{data.latestReceipt.totalAmount.toLocaleString()}</Text>
                  </View>
                </TouchableOpacity>
              ) : <View style={styles.noImageBox}><Text style={styles.noDataText}>画像なし</Text></View>}
            </View>
          </>
        )}
      </ScrollView>

      {/* 詳細モーダル */}
      <Modal visible={isMainModalVisible} animationType="slide">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>詳細明細</Text>
            <TouchableOpacity onPress={() => setMainModalVisible(false)}>
              <Text style={styles.modalCloseText}>閉じる</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalScroll}>
            {data?.latestReceipt?.imagePath && (
              <Image source={{ uri: `${BASE_URL}/${data.latestReceipt.imagePath}` }} style={styles.modalImage} resizeMode="contain" />
            )}
            <View style={styles.itemListContainer}>
              {data?.latestReceipt?.items.map((item) => (
                <View key={item.id} style={styles.itemRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <Text style={styles.itemPrice}>¥{item.price.toLocaleString()}</Text>
                  </View>
                  <TouchableOpacity 
                    style={[styles.categoryBadge, { backgroundColor: item.category?.color || theme.colors.secondary }]}
                    onPress={() => { setSelectedItemId(item.id); setPickerVisible(true); }}
                  >
                    <Text style={styles.categoryBadgeText}>{item.category?.name || '未分類'}</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* カテゴリ選択ピッカー */}
      <Modal visible={isPickerVisible} transparent={true} animationType="fade">
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerWindow}>
            <Text style={styles.pickerHeader}>カテゴリー変更</Text>
            <FlatList
              data={allCategories}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.pickerItem} onPress={() => handleUpdateCategory(item.id)}>
                  <View style={[styles.colorDot, { backgroundColor: item.color }]} />
                  <Text style={styles.pickerItemText}>{item.name}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={styles.pickerCancel} onPress={() => setPickerVisible(false)}>
              <Text style={styles.pickerCancelText}>キャンセル</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  backButton: { ...theme.typography.body, color: theme.colors.primary, fontWeight: '700' },
  headerTitle: { ...theme.typography.h2, color: theme.colors.text.main },
  scrollContent: { padding: theme.spacing.lg },
  topInfo: { marginBottom: theme.spacing.md },
  headerSubtitle: { ...theme.typography.caption, color: theme.colors.text.muted, letterSpacing: 1 },
  monthPickerContainer: { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.md, marginTop: 8, borderWidth: 1, borderColor: theme.colors.border, height: 50, justifyContent: 'center' },
  monthPicker: { width: '100%' },
  summaryCard: { backgroundColor: theme.colors.surface, padding: theme.spacing.lg, borderRadius: theme.borderRadius.lg, marginBottom: theme.spacing.xl, alignItems: 'center', borderWidth: 1, borderColor: theme.colors.border, elevation: 3 },
  summaryLabel: { ...theme.typography.caption, color: theme.colors.text.muted },
  totalValue: { ...theme.typography.h1, fontSize: 36, color: theme.colors.primary, marginVertical: 4 },
  comparisonRow: { flexDirection: 'row', alignItems: 'center' },
  comparisonLabel: { ...theme.typography.caption, marginRight: 8 },
  diffValue: { fontWeight: '700', fontSize: 16 },
  section: { marginBottom: theme.spacing.xl },
  sectionTitle: { ...theme.typography.h2, color: theme.colors.text.main, marginBottom: theme.spacing.md, borderLeftWidth: 4, borderLeftColor: theme.colors.primary, paddingLeft: 8 },
  statsCard: { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.border },
  trendRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.colors.background },
  trendPeriod: { flex: 1, fontWeight: '700' },
  trendAmount: { flex: 1, textAlign: 'right' },
  trendDiff: { flex: 1, textAlign: 'right', fontSize: 12, fontWeight: '600' },
  paretoWrapper: { marginBottom: 12 },
  paretoTextRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  paretoName: { fontWeight: '700', fontSize: 14 },
  paretoValue: { fontSize: 12, color: theme.colors.text.muted },
  paretoBarContainer: { height: 16, backgroundColor: '#E9ECEF', borderRadius: 8, flexDirection: 'row', alignItems: 'center', overflow: 'hidden' },
  paretoBar: { height: '100%' },
  cumText: { fontSize: 10, position: 'absolute', right: 8, fontWeight: '700', color: theme.colors.text.main },
  paretoNote: { fontSize: 11, color: theme.colors.text.muted, marginTop: 8, fontStyle: 'italic' },
  chartCard: { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, alignItems: 'center', borderWidth: 1, borderColor: theme.colors.border },
  receiptPreviewCard: { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.md, overflow: 'hidden', borderWidth: 1, borderColor: theme.colors.border, elevation: 4 },
  receiptImage: { width: '100%', height: 160, backgroundColor: theme.colors.border },
  receiptInfoOverlay: { padding: theme.spacing.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  receiptStoreName: { ...theme.typography.body, fontWeight: '700' },
  receiptAmount: { ...theme.typography.h2, color: theme.colors.primary },
  noImageBox: { height: 100, backgroundColor: theme.colors.border, borderRadius: theme.borderRadius.md, justifyContent: 'center', alignItems: 'center' },
  noDataText: { ...theme.typography.caption, color: theme.colors.text.muted },
  modalContainer: { flex: 1, backgroundColor: theme.colors.background },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: theme.spacing.lg, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  modalTitle: { ...theme.typography.h2 },
  modalCloseText: { color: theme.colors.error, fontWeight: '600' },
  modalScroll: { flex: 1 },
  modalImage: { width: '100%', height: 300, marginVertical: theme.spacing.md },
  itemListContainer: { paddingHorizontal: theme.spacing.lg },
  itemRow: { flexDirection: 'row', paddingVertical: theme.spacing.md, borderBottomWidth: 1, borderBottomColor: theme.colors.border, alignItems: 'center' },
  itemName: { ...theme.typography.body },
  itemPrice: { ...theme.typography.body, fontWeight: '700', color: theme.colors.primary },
  categoryBadge: { paddingHorizontal: theme.spacing.md, paddingVertical: 6, borderRadius: theme.borderRadius.round },
  categoryBadgeText: { color: 'white', fontWeight: '700', fontSize: 12 },
  pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  pickerWindow: { width: '85%', maxHeight: '70%', backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg, padding: theme.spacing.lg },
  pickerHeader: { ...theme.typography.h2, marginBottom: theme.spacing.md, textAlign: 'center' },
  pickerItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: theme.spacing.md, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  colorDot: { width: 14, height: 14, borderRadius: 7, marginRight: theme.spacing.md },
  pickerItemText: { ...theme.typography.body },
  pickerCancel: { marginTop: theme.spacing.md, alignItems: 'center' },
  pickerCancelText: { color: theme.colors.error, fontWeight: '700' }
});