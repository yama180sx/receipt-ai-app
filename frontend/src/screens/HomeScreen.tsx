import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, Dimensions, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../theme';
import apiClient from '../utils/apiClient';

const { width: windowWidth } = Dimensions.get('window');

interface HomeScreenProps {
  onScan: () => void;
  onGoToHistory: () => void;
  onGoToStats: () => void;
  onGoToCategories: () => void; 
  onGoToProductMaster: () => void; 
  currentMemberId: number;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ 
  onScan, 
  onGoToHistory, 
  onGoToStats, 
  onGoToCategories,
  onGoToProductMaster,
  currentMemberId 
}) => {
  const [latestReceipt, setLatestReceipt] = useState<any>(null);
  const [monthlyTotal, setMonthlyTotal] = useState<number>(0); // 今月の合計用
  const [loading, setLoading] = useState(true);

  // データの取得をまとめる
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [latestRes, summaryRes] = await Promise.all([
        apiClient.get('/receipts/latest', { params: { memberId: currentMemberId } }),
        // バックエンドに合計取得APIがあると仮定（未実装なら0を表示）
        apiClient.get('/statistics/summary', { params: { memberId: currentMemberId } }).catch(() => ({ data: { data: { total: 0 } } }))
      ]);

      if (latestRes.data && latestRes.data.success) {
        setLatestReceipt(latestRes.data.data);
      }
      
      if (summaryRes.data && summaryRes.data.success) {
        setMonthlyTotal(summaryRes.data.data.total || 0);
      }
    } catch (error) {
      console.error('データ取得失敗:', error);
    } finally {
      setLoading(false);
    }
  }, [currentMemberId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // レスポンシブ判定（iPad/Web用）
  const isWide = windowWidth > 600;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <Text style={styles.headerSubtitle}>AI Receipt Manager</Text>
          <Text style={styles.headerTitle}>
            {currentMemberId === 1 ? '山本さんのダッシュボード' : '共有メニュー'}
          </Text>
        </View>

        {/* --- [New] 今月の合計カード --- */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>今月の利用合計</Text>
          <View style={styles.summaryAmountRow}>
            <Text style={styles.summarySymbol}>¥</Text>
            <Text style={styles.summaryAmount}>{monthlyTotal.toLocaleString()}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <TouchableOpacity onPress={onGoToStats}>
            <Text style={styles.summaryLink}>統計の詳細を見る ›</Text>
          </TouchableOpacity>
        </View>

        {/* メインアクション */}
        <TouchableOpacity 
          style={styles.captureButton} 
          activeOpacity={0.8}
          onPress={onScan}
        >
          <View style={styles.iconCircle}>
            <Text style={styles.iconText}>📷</Text>
          </View>
          <Text style={styles.captureButtonText}>レシートを撮影・解析</Text>
        </TouchableOpacity>

        {/* メニューエリア：iPadなら横並びを強調 */}
        <View style={[styles.row, isWide && styles.wideRow]}>
          <TouchableOpacity style={[styles.menuCard, isWide && styles.wideMenuCard]} onPress={onGoToHistory}>
            <Text style={styles.menuIcon}>📋</Text>
            <Text style={styles.menuLabel}>履歴一覧</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.menuCard, isWide && styles.wideMenuCard]} onPress={onGoToStats}>
            <Text style={styles.menuIcon}>📊</Text>
            <Text style={styles.menuLabel}>支出統計</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>マスタ管理</Text>
          <TouchableOpacity style={styles.settingsCard} onPress={onGoToCategories}>
            <View style={styles.settingsIconWrapper}>
              <Text style={styles.settingsIcon}>⚙️</Text>
            </View>
            <View style={styles.settingsTextWrapper}>
              <Text style={styles.settingsLabel}>カテゴリー設定</Text>
            </View>
            <Text style={styles.arrowIcon}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.settingsCard, { marginTop: -10 }]} onPress={onGoToProductMaster}>
            <View style={[styles.settingsIconWrapper, { backgroundColor: '#E3F2FD' }]}>
              <Text style={styles.settingsIcon}>🧠</Text>
            </View>
            <View style={styles.settingsTextWrapper}>
              <Text style={styles.settingsLabel}>学習マスタ管理</Text>
            </View>
            <Text style={styles.arrowIcon}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>最近の登録</Text>
          {loading ? (
            <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 10 }} />
          ) : latestReceipt ? (
            <TouchableOpacity style={styles.latestCard} onPress={onGoToHistory}>
              <View style={styles.cardInfo}>
                <Text style={styles.storeName} numberOfLines={1}>{latestReceipt.storeName || '店名不明'}</Text>
                <Text style={styles.dateText}>
                  {latestReceipt.date ? new Date(latestReceipt.date).toLocaleDateString('ja-JP') : '日付不明'}
                </Text>
              </View>
              <Text style={styles.amountText}>
                ¥{(latestReceipt.totalAmount || 0).toLocaleString()}
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={[styles.latestCard, { justifyContent: 'center' }]}>
              <Text style={styles.dateText}>表示できるデータがありません</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scrollContent: { padding: theme.spacing.lg, paddingBottom: 40 },
  header: { marginBottom: theme.spacing.lg, marginTop: theme.spacing.md },
  headerSubtitle: { ...theme.typography.caption, color: theme.colors.text.muted, textTransform: 'uppercase', letterSpacing: 1.5 },
  headerTitle: { ...theme.typography.h1, color: theme.colors.text.main, marginTop: theme.spacing.xs },
  
  // --- New Summary Card Style ---
  summaryCard: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  summaryLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '600' },
  summaryAmountRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 5 },
  summarySymbol: { color: 'white', fontSize: 20, marginRight: 4, fontWeight: 'bold' },
  summaryAmount: { color: 'white', fontSize: 36, fontWeight: 'bold' },
  summaryDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginVertical: theme.spacing.md },
  summaryLink: { color: 'white', fontSize: 14, fontWeight: '600', textAlign: 'right' },

  captureButton: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    borderStyle: 'dashed',
  },
  iconCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.primary, justifyContent: 'center', alignItems: 'center', marginRight: theme.spacing.md },
  iconText: { fontSize: 20 },
  captureButtonText: { ...theme.typography.h2, color: theme.colors.primary },
  
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: theme.spacing.md },
  wideRow: { justifyContent: 'flex-start', gap: theme.spacing.md },
  menuCard: {
    backgroundColor: theme.colors.surface,
    width: (windowWidth - theme.spacing.lg * 2 - theme.spacing.md) / 2,
    maxWidth: 280,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  wideMenuCard: { width: '48%' },
  menuIcon: { fontSize: 28, marginBottom: theme.spacing.sm },
  menuLabel: { ...theme.typography.body, fontWeight: '600', color: theme.colors.text.main },
  
  section: { marginTop: theme.spacing.lg },
  sectionTitle: { ...theme.typography.h2, color: theme.colors.text.main, marginBottom: theme.spacing.sm },
  
  settingsCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surface, padding: theme.spacing.md, borderRadius: theme.borderRadius.md, borderWidth: 1, borderColor: theme.colors.border, marginBottom: theme.spacing.md },
  settingsIconWrapper: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.colors.background, justifyContent: 'center', alignItems: 'center', marginRight: theme.spacing.md },
  settingsIcon: { fontSize: 16 },
  settingsTextWrapper: { flex: 1 },
  settingsLabel: { ...theme.typography.body, fontWeight: '600', color: theme.colors.text.main },
  arrowIcon: { fontSize: 20, color: theme.colors.text.muted },
  
  latestCard: { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: theme.colors.border },
  cardInfo: { flex: 1 },
  storeName: { ...theme.typography.body, fontWeight: '700', color: theme.colors.text.main },
  dateText: { ...theme.typography.caption, color: theme.colors.text.muted },
  amountText: { ...theme.typography.h2, color: theme.colors.primary }
});