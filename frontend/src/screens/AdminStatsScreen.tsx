import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ActivityIndicator, 
  ScrollView,
  TouchableOpacity
} from 'react-native';
import { theme } from '../theme';
import apiClient from '../utils/apiClient';

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
    } catch (error: any) {
      console.error('Stats Fetch Error:', error);
      // ★ Alertを廃止し、バックエンドのエラーメッセージを抽出してステートにセット
      const serverError = error?.response?.data?.error || error?.response?.data?.message || 'コスト統計の取得に失敗しました。';
      setErrorMsg(serverError);
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
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← 戻る</Text>
        </TouchableOpacity>
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

            <View style={styles.tableHeader}>
              <Text style={[styles.tableCell, { flex: 1.5 }]}>年月</Text>
              <Text style={[styles.tableCell, { flex: 2 }]}>In / Out (Tokens)</Text>
              <Text style={[styles.tableCell, { flex: 1.5, textAlign: 'right' }]}>概算(円)</Text>
            </View>

            {stats.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>データがありません</Text>
              </View>
            ) : (
              stats.map((item, index) => (
                <View key={`${item.month}-${item.modelId}-${index}`} style={styles.tableRow}>
                  <View style={{ flex: 1.5 }}>
                    <Text style={styles.cellMainText}>{item.month}</Text>
                    <Text style={styles.cellSubText} numberOfLines={1}>{item.modelId}</Text>
                  </View>
                  <View style={{ flex: 2 }}>
                    <Text style={styles.cellMainText}>{item.totalPromptTokens.toLocaleString()}</Text>
                    <Text style={styles.cellSubText}>{item.totalCandidatesTokens.toLocaleString()}</Text>
                  </View>
                  <Text style={[styles.cellMainText, { flex: 1.5, textAlign: 'right', fontWeight: 'bold' }]}>
                    ¥{item.estimatedCostJpy.toFixed(2)}
                  </Text>
                </View>
              ))
            )}
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
  backButton: { width: 60, paddingVertical: 8 },
  backButtonText: { color: theme.colors.primary, fontWeight: 'bold' },
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
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: adm.border,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  tableCell: { fontSize: 13, fontWeight: 'bold', color: theme.colors.text.muted },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: adm.surface,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: adm.border,
  },
  cellMainText: { fontSize: 15, color: theme.colors.text.main },
  cellSubText: { fontSize: 12, color: theme.colors.text.muted, marginTop: 4 },
  emptyContainer: { padding: 32, alignItems: 'center' },
  emptyText: { color: theme.colors.text.muted, fontSize: 16 },
});