import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, Dimensions, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../theme';
import apiClient from '../utils/apiClient';

const { width } = Dimensions.get('window');

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
  const [loading, setLoading] = useState(true);

  const fetchLatestReceipt = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/receipts/latest', {
        params: { memberId: currentMemberId }
      });

      /**
       * ★ 修正ポイント: [Issue #40] 
       * バックエンドのレスポンス形式 { success: true, data: Receipt } に合わせ、
       * response.data.data を取得します。
       */
      if (response.data && response.data.success) {
        setLatestReceipt(response.data.data);
      } else {
        setLatestReceipt(null);
      }
    } catch (error) {
      console.error('最新レシート取得失敗:', error);
      setLatestReceipt(null);
    } finally {
      setLoading(false);
    }
  }, [currentMemberId]);

  useEffect(() => {
    fetchLatestReceipt();
  }, [fetchLatestReceipt]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <Text style={styles.headerSubtitle}>AI Receipt Manager</Text>
          <Text style={styles.headerTitle}>
            {currentMemberId === 1 ? '自分のメニュー' : 'その他のメニュー'}
          </Text>
        </View>

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

        <View style={styles.row}>
          <TouchableOpacity style={styles.menuCard} onPress={onGoToHistory}>
            <Text style={styles.menuIcon}>📋</Text>
            <Text style={styles.menuLabel}>履歴一覧</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuCard} onPress={onGoToStats}>
            <Text style={styles.menuIcon}>📊</Text>
            <Text style={styles.menuLabel}>支出統計</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={styles.settingsCard} 
          onPress={onGoToCategories}
          activeOpacity={0.7}
        >
          <View style={styles.settingsIconWrapper}>
            <Text style={styles.settingsIcon}>⚙️</Text>
          </View>
          <View style={styles.settingsTextWrapper}>
            <Text style={styles.settingsLabel}>カテゴリー設定</Text>
            <Text style={styles.settingsSubtitle}>マスタの追加・編集・削除</Text>
          </View>
          <Text style={styles.arrowIcon}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.settingsCard, { marginTop: -15 }]} 
          onPress={onGoToProductMaster}
          activeOpacity={0.7}
        >
          <View style={[styles.settingsIconWrapper, { backgroundColor: '#E3F2FD' }]}>
            <Text style={styles.settingsIcon}>🧠</Text>
          </View>
          <View style={styles.settingsTextWrapper}>
            <Text style={styles.settingsLabel}>学習マスタ管理</Text>
            <Text style={styles.settingsSubtitle}>AIの学習データ修正・店舗名統合</Text>
          </View>
          <Text style={styles.arrowIcon}>›</Text>
        </TouchableOpacity>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>最近の登録</Text>
          {loading ? (
            <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 10 }} />
          ) : latestReceipt ? (
            <View style={styles.latestCard}>
              <View style={styles.cardInfo}>
                <Text style={styles.storeName} numberOfLines={1}>{latestReceipt.storeName || '店名不明'}</Text>
                <Text style={styles.dateText}>
                  {latestReceipt.date ? new Date(latestReceipt.date).toLocaleDateString('ja-JP') : '日付不明'}
                </Text>
              </View>
              <Text style={styles.amountText}>
                ¥{(latestReceipt.totalAmount || 0).toLocaleString()}
              </Text>
            </View>
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
  scrollContent: { padding: theme.spacing.lg },
  header: { marginBottom: theme.spacing.xl, marginTop: theme.spacing.md },
  headerSubtitle: { ...theme.typography.caption, color: theme.colors.text.muted, textTransform: 'uppercase', letterSpacing: 1.5 },
  headerTitle: { ...theme.typography.h1, color: theme.colors.text.main, marginTop: theme.spacing.xs },
  captureButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
    ...Platform.select({
      ios: { shadowColor: theme.colors.primary, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 15 },
      android: { elevation: 8 }
    })
  },
  iconCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: theme.spacing.md },
  iconText: { fontSize: 30 },
  captureButtonText: { ...theme.typography.h2, color: theme.colors.text.inverse },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: theme.spacing.md },
  menuCard: {
    backgroundColor: theme.colors.surface,
    width: (width - theme.spacing.lg * 2 - theme.spacing.md) / 2,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    elevation: 2
  },
  menuIcon: { fontSize: 24, marginBottom: theme.spacing.sm },
  menuLabel: { ...theme.typography.body, fontWeight: '600', color: theme.colors.text.main },
  settingsCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surface, padding: theme.spacing.md, borderRadius: theme.borderRadius.md, borderWidth: 1, borderColor: theme.colors.border, marginBottom: theme.spacing.xl, elevation: 1 },
  settingsIconWrapper: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.background, justifyContent: 'center', alignItems: 'center', marginRight: theme.spacing.md },
  settingsIcon: { fontSize: 18 },
  settingsTextWrapper: { flex: 1 },
  settingsLabel: { ...theme.typography.body, fontWeight: '600', color: theme.colors.text.main },
  settingsSubtitle: { ...theme.typography.caption, color: theme.colors.text.muted },
  arrowIcon: { fontSize: 24, color: theme.colors.text.muted, paddingHorizontal: 5 },
  section: { marginTop: theme.spacing.md },
  sectionTitle: { ...theme.typography.h2, color: theme.colors.text.main, marginBottom: theme.spacing.md },
  latestCard: { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: theme.colors.border },
  cardInfo: { flex: 1 },
  storeName: { ...theme.typography.body, fontWeight: '700', color: theme.colors.text.main },
  dateText: { ...theme.typography.caption, color: theme.colors.text.muted },
  amountText: { ...theme.typography.h2, color: theme.colors.primary }
});