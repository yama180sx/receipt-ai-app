import React, { useState, useEffect, useMemo } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator, 
  Platform,
  useWindowDimensions
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { theme, BREAKPOINTS } from '../theme';
import { api } from '../utils/apiClient';

interface SettlementSummaryScreenProps {
  onBack: () => void;
}

export const SettlementSummaryScreen: React.FC<SettlementSummaryScreenProps> = ({ onBack }) => {
  const { width } = useWindowDimensions();
  const isWide = width >= BREAKPOINTS.TABLET;

  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [summaryData, setSummaryData] = useState<any[]>([]);

  // 過去6ヶ月の選択肢を生成
  const months = useMemo(() => {
    return Array.from({ length: 6 }).map((_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      return d.toISOString().slice(0, 7);
    });
  }, []);

  const loadSettlementData = async () => {
    try {
      setLoading(true);
      const res = await api.getSettlementStatus(selectedMonth);
      if (res.success) {
        setSummaryData(res.data.members || []);
      }
    } catch (err) {
      console.error('精算サマリーの取得失敗:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettlementData();
  }, [selectedMonth]);

  const renderMonthPicker = () => {
    if (Platform.OS === 'web') {
      return (
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          style={StyleSheet.flatten(styles.webSelect)}
        >
          {months.map(m => (
            <option key={m} value={m}>{`${m.split('-')[0]}年${m.split('-')[1]}月`}</option>
          ))}
        </select>
      );
    }

    return (
      <Picker 
        selectedValue={selectedMonth} 
        onValueChange={setSelectedMonth} 
        style={styles.filterPicker}
        mode="dropdown"
      >
        {months.map(m => (
          <Picker.Item key={m} label={`${m.split('-')[0]}年${m.split('-')[1]}月`} value={m} />
        ))}
      </Picker>
    );
  };

  return (
    <View style={styles.container}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← 戻る</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>家族間精算サマリー</Text>
        <View style={styles.monthPickerContainer}>
          {renderMonthPicker()}
        </View>
      </View>

      {loading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
          
          {/* キャッシュ・フロー・サマリーカード群 */}
          <View style={[styles.cardGrid, isWide ? styles.rowLayout : styles.colLayout]}>
            {summaryData.map(m => {
              const isSurplus = m.balance >= 0;
              return (
                <View key={m.memberId} style={[styles.summaryCard, isSurplus ? styles.cardSurplus : styles.cardDeficit]}>
                  <Text style={styles.cardMemberName}>{m.name}</Text>
                  <View style={styles.statRow}>
                    <Text style={styles.statLabel}>実際の立替支払額:</Text>
                    <Text style={styles.statValue}>¥{m.totalPaid.toLocaleString()}</Text>
                  </View>
                  <View style={styles.statRow}>
                    <Text style={styles.statLabel}>本来の自己負担額:</Text>
                    <Text style={styles.statValue}>¥{m.totalOwed.toLocaleString()}</Text>
                  </View>
                  <View style={styles.cardDivider} />
                  <Text style={styles.balanceLabel}>{isSurplus ? "他メンバーから受け取る額" : "他メンバーへ支払う額"}</Text>
                  <Text style={[styles.balanceValue, isSurplus ? styles.textSurplus : styles.textDeficit]}>
                    ¥{Math.abs(m.balance).toLocaleString()}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* 清算ステータス詳細（スプレッドシート風一覧テーブル） */}
          <View style={styles.tableContainer}>
            <Text style={styles.tableTitle}>📋 世帯内精算内訳（一覧）</Text>
            <View style={styles.tableWrapper}>
              {/* テーブルヘッダー */}
              <View style={[styles.tableRow, styles.tableHeader]}>
                <Text style={[styles.cell, styles.cellName, styles.headerText]}>メンバー名</Text>
                <Text style={[styles.cell, styles.cellAmount, styles.headerText]}>立替金額(A)</Text>
                <Text style={[styles.cell, styles.cellAmount, styles.headerText]}>負担金額(B)</Text>
                <Text style={[styles.cell, styles.cellAmount, styles.headerText]}>精算差額(A - B)</Text>
              </View>

              {/* テーブルボディ */}
              {summaryData.map(m => {
                // ★ 修正箇所: スタイル計算を変数に切り出し、型エラーと可読性の問題を解消
                const balanceStyle = m.balance >= 0 ? styles.textSurplus : styles.textDeficit;
                
                return (
                  <View key={m.memberId} style={styles.tableRow}>
                    <Text style={[styles.cell, styles.cellName, styles.bodyText, styles.boldText]}>{m.name}</Text>
                    <Text style={[styles.cell, styles.cellAmount, styles.bodyText]}>¥{m.totalPaid.toLocaleString()}</Text>
                    <Text style={[styles.cell, styles.cellAmount, styles.bodyText]}>¥{m.totalOwed.toLocaleString()}</Text>
                    <Text style={[styles.cell, styles.cellAmount, balanceStyle, styles.boldText]}>
                      {m.balance >= 0 ? "+" : ""}{m.balance.toLocaleString()}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>

        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  centerLoading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  backButton: { paddingRight: 15 },
  backButtonText: { color: theme.colors.primary, fontWeight: '700', fontSize: 16 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: theme.colors.text.main, flex: 1 },
  monthPickerContainer: { width: 160, height: 40, backgroundColor: theme.colors.surface, borderRadius: 8, justifyContent: 'center', borderWidth: 1, borderColor: theme.colors.border, overflow: 'hidden' },
  filterPicker: { width: '100%' },
  webSelect: {
    width: '100%',
    height: '100%',
    borderWidth: 0,
    backgroundColor: 'transparent',
    paddingLeft: 10,
    fontSize: 14,
    color: theme.colors.text.main,
    ...Platform.select({ web: { outlineStyle: 'none' } as any }),
  } as any,
  scrollContainer: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  rowLayout: { flexDirection: 'row' },
  colLayout: { flexDirection: 'column' },
  cardGrid: { gap: 20, marginBottom: 30 },
  summaryCard: { flex: 1, padding: 20, borderRadius: 12, borderWidth: 1, elevation: 2, backgroundColor: '#fff' },
  cardSurplus: { borderColor: '#bbf7d0', backgroundColor: '#f0fdf4' },
  cardDeficit: { borderColor: '#fecaca', backgroundColor: '#fef2f2' },
  cardMemberName: { fontSize: 18, fontWeight: 'bold', marginBottom: 12, color: theme.colors.text.main },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  statLabel: { fontSize: 13, color: theme.colors.text.muted },
  statValue: { fontSize: 14, fontWeight: '600', color: theme.colors.text.main },
  cardDivider: { height: 1, backgroundColor: 'rgba(0,0,0,0.05)', marginVertical: 10 },
  balanceLabel: { fontSize: 11, color: theme.colors.text.muted, fontWeight: 'bold' },
  balanceValue: { fontSize: 24, fontWeight: 'bold', marginTop: 4 },
  textSurplus: { color: '#16a34a' },
  textDeficit: { color: '#dc2626' },
  
  tableContainer: { backgroundColor: '#fff', padding: 20, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border },
  tableTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 15, color: theme.colors.text.main },
  tableWrapper: { borderWidth: 1, borderColor: '#F0F0F0', borderRadius: 8, overflow: 'hidden' },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#F0F0F0', alignItems: 'center', height: 48 },
  tableHeader: { backgroundColor: '#F8F9FA' },
  cell: { paddingHorizontal: 12, justifyContent: 'center' },
  headerText: { fontWeight: 'bold', color: theme.colors.text.muted, fontSize: 13 },
  bodyText: { fontSize: 14, color: theme.colors.text.main },
  boldText: { fontWeight: 'bold' }, // ★ インラインスタイルではなく、StyleSheetに定義
  cellName: { flex: 1.5, minWidth: 100 },
  cellAmount: { flex: 1, textAlign: 'right' }
});