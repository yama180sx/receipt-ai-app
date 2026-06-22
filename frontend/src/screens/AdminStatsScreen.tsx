import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { AppBackButton } from '../components/ui';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { borderRadius } from '../theme/radii';
import { shadows } from '../theme/shadows';
import { cardStyles } from '../theme/cardStyles';
import { screenLayout } from '../theme/screenLayout';
import { tableStyles } from '../theme/tableStyles';
import { adminApi, type AdminCostStatRow } from '../api';
import { getApiErrorMessage } from '../utils/apiError';

interface AdminStatsScreenProps {
  onBack: () => void;
}

const adm = colors.semantic.admin;

export const AdminStatsScreen: React.FC<AdminStatsScreenProps> = ({ onBack }) => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AdminCostStatRow[]>([]);
  const [totalCost, setTotalCost] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await adminApi.getCostStats();
      const rows = res.data ?? [];
      setStats(rows);
      const total = rows.reduce((sum, item) => sum + item.estimatedCostJpy, 0);
      setTotalCost(total);
    } catch (error: unknown) {
      setErrorMsg(getApiErrorMessage(error, 'コスト統計の取得に失敗しました。'));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[screenLayout.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[screenLayout.container, styles.containerAdmin]}>
      <View style={[screenLayout.header, styles.headerAdmin]}>
        <AppBackButton onPress={onBack} />
        <Text style={screenLayout.headerTitle}>AIコスト統計</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={[screenLayout.scrollContent, styles.content]}>
        {errorMsg ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorTitle}>アクセス権限エラー</Text>
            <Text style={styles.errorSubText}>{errorMsg}</Text>
          </View>
        ) : (
          <>
            <View style={[cardStyles.summaryCard, styles.primarySummaryCard]}>
              <Text style={styles.summaryLabel}>累計利用コスト (概算)</Text>
              <Text style={styles.summaryAmount}>¥{totalCost.toFixed(2)}</Text>
              <Text style={styles.summaryNote}>※為替レート150円/$、Gemini 2.0 Flashでの算出</Text>
            </View>

            <View style={cardStyles.section}>
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
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  containerAdmin: { backgroundColor: adm.background },
  loadingContainer: { justifyContent: 'center', alignItems: 'center' },
  headerAdmin: { backgroundColor: adm.surface, borderBottomColor: adm.border },
  content: { paddingBottom: 40 },
  errorContainer: {
    backgroundColor: adm.errorBg,
    padding: spacing.md,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: adm.errorBorder,
    marginTop: spacing.sm,
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
  primarySummaryCard: {
    backgroundColor: colors.primary,
    alignItems: 'flex-start',
    ...shadows.md,
  },
  summaryLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 14, marginBottom: spacing.sm },
  summaryAmount: { color: colors.text.inverse, fontSize: 36, fontWeight: 'bold' },
  summaryNote: { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: spacing.sm },
  colMonth: { flex: 1.5 },
  colTokens: { flex: 2 },
  colCost: { flex: 1.5, textAlign: 'right' },
  cellSubText: { fontSize: 12, color: colors.text.muted, marginTop: 4 },
  emptyRow: { justifyContent: 'center', paddingVertical: spacing.lg },
});
