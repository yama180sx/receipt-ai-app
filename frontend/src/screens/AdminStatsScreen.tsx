import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ActivityIndicator, 
  ScrollView,
} from 'react-native';
import { AppBackButton } from '../components/ui';
import { theme, tableStyles } from '../theme';
import apiClient from '../utils/apiClient';
import { getApiErrorMessage } from '../utils/apiError';

interface StatData {
  month: string;
  modelId: string;
  totalPromptTokens: number;
  totalCandidatesTokens: number;
  estimatedCostJpy: number;
}

interface AdminStatsScreenProps {
  onBack: () => void;
}

export const AdminStatsScreen: React.FC<AdminStatsScreenProps> = ({ onBack }) => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<StatData[]>([]);
  const [totalCost, setTotalCost] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null); // ★ 追加: エラー状態管理

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await apiClient.get('/admin/stats');
      if (res.data && res.data.success) {
        setStats(res.data.data);
        const total = res.data.data.reduce((sum: number, item: StatData) => sum + item.estimatedCostJpy, 0);
        setTotalCost(total);
      }
    } catch (error: unknown) {
      console.error('Stats Fetch Error:', error);
      setErrorMsg(getApiErrorMessage(error, 'コスト統計の取得に失敗しました。'));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <AppBackButton onPress={onBack} />
        <Text style={styles.headerTitle}>AIコスト統計</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* ★ エラーが存在する場合は赤帯のコンテナを表示して処理をブロック */}
        {errorMsg ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorTitle}>アクセス権限エラー</Text>
            <Text style={styles.errorSubText}>{errorMsg}</Text>
          </View>
        ) : (
          <>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>累計利用コスト (概算)</Text>
              <Text style={styles.summaryAmount}>¥{totalCost.toFixed(2)}</Text>
              <Text style={styles.summaryNote}>※為替レート150円/$、Gemini 2.0 Flashでの算出</Text>
            </View>

            <View style={tableStyles.wrapper}>
              <View style={[tableStyles.row, tableStyles.headerRow]}>
                <Text style={[tableStyles.cell, styles.colMonth, tableStyles.headerText]}>年月</Text>
                <Text style={[tableStyles.cell, styles.colTokens, tableStyles.headerText]}>In / Out (Tokens)</Text>
                <Text style={[tableStyles.cell, styles.colCost, tableStyles.headerText]}>概算(円)</Text>
              </View>

              {stats.length === 0 ? (
                <View style={[tableStyles.row, styles.emptyRow]}>
                  <Text style={[tableStyles.cell, tableStyles.bodyText]}>データがありません</Text>
                </View>
              ) : (
                stats.map((item, index) => (
                  <View key={`${item.month}-${item.modelId}-${index}`} style={tableStyles.row}>
                    <View style={[tableStyles.cell, styles.colMonth]}>
                      <Text style={tableStyles.bodyText}>{item.month}</Text>
                      <Text style={styles.cellSubText} numberOfLines={1}>{item.modelId}</Text>
                    </View>
                    <View style={[tableStyles.cell, styles.colTokens]}>
                      <Text style={tableStyles.bodyText}>{item.totalPromptTokens.toLocaleString()}</Text>
                      <Text style={styles.cellSubText}>{item.totalCandidatesTokens.toLocaleString()}</Text>
                    </View>
                    <Text style={[tableStyles.cell, styles.colCost, tableStyles.bodyText, tableStyles.boldText]}>
                      ¥{item.estimatedCostJpy.toFixed(2)}
                    </Text>
                  </View>
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
};

const adm = theme.colors.semantic.admin;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: adm.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: adm.surface,
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: adm.border,
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: theme.colors.text.main },
  content: { padding: 16, paddingBottom: 40 },
  
  errorContainer: {
    backgroundColor: adm.errorBg,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: adm.errorBorder,
    marginTop: 8,
  },
  errorTitle: {
    color: adm.errorText,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  errorSubText: {
    color: adm.errorText,
    fontSize: 14,
  },

  summaryCard: {
    backgroundColor: theme.colors.primary,
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
    ...theme.shadows.md,
  },
  summaryLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 14, marginBottom: 8 },
  summaryAmount: { color: theme.colors.text.inverse, fontSize: 36, fontWeight: 'bold' },
  summaryNote: { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 8 },
  colMonth: { flex: 1.5 },
  colTokens: { flex: 2 },
  colCost: { flex: 1.5, textAlign: 'right' },
  cellSubText: { fontSize: 12, color: theme.colors.text.muted, marginTop: 4 },
  emptyRow: { justifyContent: 'center', paddingVertical: 24 },
});