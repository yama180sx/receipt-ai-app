import React, { useState, useEffect, useMemo } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator, 
  useWindowDimensions,
  Alert
} from 'react-native';
import {
  AppBackButton,
  AppButton,
  AppFormField,
  AppModal,
  AppSelect,
  AppTextInput,
  modalStyles,
} from '../components/ui';
import { BUTTON_LABELS } from '../constants/buttonLabels';
import { theme, tableStyles, BREAKPOINTS } from '../theme';
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

  // 送金モーダル用ステート
  const [isTransferModalVisible, setTransferModalVisible] = useState(false);
  const [transferFrom, setTransferFrom] = useState<number | null>(null);
  const [transferTo, setTransferTo] = useState<number | null>(null);
  const [transferAmount, setTransferAmount] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [transferFieldErrors, setTransferFieldErrors] = useState<{
    from?: string;
    to?: string;
    amount?: string;
  }>({});

  // 過去6ヶ月の選択肢を生成
  const months = useMemo(() => {
    return Array.from({ length: 6 }).map((_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      return d.toISOString().slice(0, 7);
    });
  }, []);

  const memberSelectOptions = useMemo(
    () =>
      summaryData.map((m: { memberId: number; name: string }) => ({
        label: m.name,
        value: m.memberId,
      })),
    [summaryData]
  );

  const monthSelectOptions = useMemo(
    () =>
      months.map((m) => ({
        label: `${m.split('-')[0]}年${m.split('-')[1]}月`,
        value: m,
      })),
    [months]
  );

  const openTransferModal = () => {
    setTransferFieldErrors({});
    setTransferModalVisible(true);
  };

  const validateTransferForm = (): boolean => {
    const errors: { from?: string; to?: string; amount?: string } = {};
    if (!transferFrom) {
      errors.from = '送金元を選択してください';
    }
    if (!transferTo) {
      errors.to = '送金先を選択してください';
    }
    if (!transferAmount.trim()) {
      errors.amount = '金額を入力してください';
    } else if (transferFrom && transferTo && transferFrom === transferTo) {
      errors.to = '送金先は送金元と異なるメンバーを選んでください';
    } else {
      const amountNum = parseInt(transferAmount.replace(/[^0-9]/g, ''), 10);
      if (isNaN(amountNum) || amountNum <= 0) {
        errors.amount = '正しい金額を入力してください';
      }
    }
    setTransferFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

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

  const handleTransferSubmit = async () => {
    if (!validateTransferForm()) {
      return;
    }

    const amountNum = parseInt(transferAmount.replace(/[^0-9]/g, ''), 10);

    setIsSubmitting(true);
    try {
      const res = await api.addSettlementTransfer({
        month: selectedMonth,
        fromMemberId: transferFrom!,
        toMemberId: transferTo!,
        amount: amountNum
      });
      if (res.success) {
        Alert.alert('成功', '送金記録を登録しました。');
        setTransferModalVisible(false);
        setTransferFrom(null);
        setTransferTo(null);
        setTransferAmount('');
        setTransferFieldErrors({});
        loadSettlementData(); // 再読み込みして残額を更新
      }
    } catch (err) {
      console.error('送金記録エラー', err);
      Alert.alert('エラー', '送金記録の登録に失敗しました。');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <AppBackButton onPress={onBack} />
        <Text style={styles.headerTitle}>家族間精算サマリー</Text>
        <View style={styles.headerRight}>
          <AppButton
            title={`＋ ${BUTTON_LABELS.recordTransfer}`}
            onPress={openTransferModal}
            size="sm"
            style={styles.addTransferButton}
          />
          <View style={styles.monthPickerContainer}>
            <AppSelect<string>
              selectedValue={selectedMonth}
              onValueChange={setSelectedMonth}
              options={monthSelectOptions}
              includePlaceholder={false}
              style={styles.monthSelect}
            />
          </View>
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
              const isSettled = m.balance === 0 && Math.abs(m.baseBalance) > 0;
              const isSurplus = m.balance > 0;
              const isDeficit = m.balance < 0;
              
              const cardVariantStyle = isSettled
                ? styles.cardSettled
                : isSurplus
                  ? styles.cardSurplus
                  : isDeficit
                    ? styles.cardDeficit
                    : styles.cardNeutral;

              return (
                <View key={m.memberId} style={[styles.summaryCard, cardVariantStyle]}>
                  <View style={styles.cardHeaderRow}>
                    <Text style={styles.cardMemberName}>{m.name}</Text>
                    {isSettled && <View style={styles.settledBadge}><Text style={styles.settledBadgeText}>精算済</Text></View>}
                  </View>

                  <View style={styles.statRow}>
                    <Text style={styles.statLabel}>実際の立替支払額:</Text>
                    <Text style={styles.statValue}>¥{m.totalPaid?.toLocaleString()}</Text>
                  </View>
                  <View style={styles.statRow}>
                    <Text style={styles.statLabel}>本来の自己負担額:</Text>
                    <Text style={styles.statValue}>¥{m.totalOwed?.toLocaleString()}</Text>
                  </View>
                  
                  {((m.transferredOut || 0) > 0 || (m.transferredIn || 0) > 0) && (
                    <View style={styles.transferSummaryBox}>
                      {(m.transferredOut || 0) > 0 && <Text style={styles.transferText}>↑ 送金済: ¥{m.transferredOut.toLocaleString()}</Text>}
                      {(m.transferredIn || 0) > 0 && <Text style={styles.transferText}>↓ 受取済: ¥{m.transferredIn.toLocaleString()}</Text>}
                    </View>
                  )}

                  <View style={styles.cardDivider} />
                  
                  {isSettled ? (
                    <Text style={[styles.balanceValue, { color: theme.colors.text.muted }]}>¥0 (精算完了)</Text>
                  ) : (
                    <>
                      <Text style={styles.balanceLabel}>{isSurplus ? "他メンバーから受け取る残額" : (isDeficit ? "他メンバーへ支払う残額" : "精算なし")}</Text>
                      <Text style={[styles.balanceValue, isSurplus ? styles.textSurplus : (isDeficit ? styles.textDeficit : styles.textNeutral)]}>
                        ¥{Math.abs(m.balance || 0).toLocaleString()}
                      </Text>
                    </>
                  )}
                </View>
              );
            })}
          </View>

          {/* 清算ステータス詳細（スプレッドシート風一覧テーブル） */}
          <View style={styles.tableContainer}>
            <Text style={styles.tableTitle}>📋 世帯内精算内訳（一覧）</Text>
            <View style={tableStyles.wrapper}>
              <View style={[tableStyles.row, tableStyles.headerRow]}>
                <Text style={[tableStyles.cell, styles.cellName, tableStyles.headerText]}>メンバー名</Text>
                <Text style={[tableStyles.cell, styles.cellAmount, tableStyles.headerText]}>立替金額(A)</Text>
                <Text style={[tableStyles.cell, styles.cellAmount, tableStyles.headerText]}>負担金額(B)</Text>
                <Text style={[tableStyles.cell, styles.cellAmount, tableStyles.headerText]}>差額(A-B)</Text>
                <Text style={[tableStyles.cell, styles.cellAmount, tableStyles.headerText]}>送金/受取相殺</Text>
                <Text style={[tableStyles.cell, styles.cellAmount, tableStyles.headerText]}>最終残額</Text>
              </View>

              {summaryData.map(m => {
                const balanceStyle = m.balance > 0 ? styles.textSurplus : (m.balance < 0 ? styles.textDeficit : styles.textNeutral);
                const offsetAmount = (m.transferredOut || 0) - (m.transferredIn || 0);
                
                return (
                  <View key={m.memberId} style={tableStyles.row}>
                    <Text style={[tableStyles.cell, styles.cellName, tableStyles.bodyText, tableStyles.boldText]}>{m.name}</Text>
                    <Text style={[tableStyles.cell, styles.cellAmount, tableStyles.bodyText]}>¥{m.totalPaid?.toLocaleString()}</Text>
                    <Text style={[tableStyles.cell, styles.cellAmount, tableStyles.bodyText]}>¥{m.totalOwed?.toLocaleString()}</Text>
                    <Text style={[tableStyles.cell, styles.cellAmount, tableStyles.bodyText]}>
                      {m.baseBalance >= 0 ? "+" : ""}{m.baseBalance?.toLocaleString()}
                    </Text>
                    <Text style={[tableStyles.cell, styles.cellAmount, tableStyles.bodyText, { color: theme.colors.text.muted }]}>
                      {offsetAmount >= 0 ? "+" : ""}{offsetAmount.toLocaleString()}
                    </Text>
                    <Text style={[tableStyles.cell, styles.cellAmount, balanceStyle, tableStyles.boldText]}>
                      {m.balance > 0 ? "+" : ""}{m.balance?.toLocaleString()}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>

        </ScrollView>
      )}

      <AppModal
        visible={isTransferModalVisible}
        onRequestClose={() => setTransferModalVisible(false)}
        title="送金・受取の記録"
        description="実際に現金やPayPay等で精算した金額を記録します。"
        footer={
          <>
            <AppButton
              title={BUTTON_LABELS.cancel}
              onPress={() => setTransferModalVisible(false)}
              variant="secondary"
              size="md"
            />
            <AppButton
              title={BUTTON_LABELS.save}
              onPress={handleTransferSubmit}
              loading={isSubmitting}
              disabled={isSubmitting}
              size="md"
              style={modalStyles.footerPrimaryButton}
            />
          </>
        }
      >
        <AppFormField label="送金元 (払った人)" error={transferFieldErrors.from}>
          <AppSelect<number | null>
            selectedValue={transferFrom}
            onValueChange={(v) => {
              setTransferFrom(v);
              if (transferFieldErrors.from) {
                setTransferFieldErrors((prev) => ({ ...prev, from: undefined }));
              }
            }}
            options={memberSelectOptions}
            error={Boolean(transferFieldErrors.from)}
          />
        </AppFormField>

        <AppFormField label="送金先 (受け取った人)" error={transferFieldErrors.to}>
          <AppSelect<number | null>
            selectedValue={transferTo}
            onValueChange={(v) => {
              setTransferTo(v);
              if (transferFieldErrors.to) {
                setTransferFieldErrors((prev) => ({ ...prev, to: undefined }));
              }
            }}
            options={memberSelectOptions}
            error={Boolean(transferFieldErrors.to)}
          />
        </AppFormField>

        <AppFormField label="送金額" error={transferFieldErrors.amount}>
          <View
            style={[
              modalStyles.inputWithUnit,
              transferFieldErrors.amount && modalStyles.selectWrapperError,
            ]}
          >
            <AppTextInput
              variant="inline"
              value={transferAmount}
              onChangeText={(v) => {
                setTransferAmount(v);
                if (transferFieldErrors.amount) {
                  setTransferFieldErrors((prev) => ({ ...prev, amount: undefined }));
                }
              }}
              keyboardType="number-pad"
              placeholder="例: 5000"
              error={Boolean(transferFieldErrors.amount)}
            />
            <Text style={modalStyles.unitSuffix}>円</Text>
          </View>
        </AppFormField>
      </AppModal>

    </View>
  );
};

const sem = theme.colors.semantic;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  centerLoading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: theme.colors.surface, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: theme.colors.text.main, flex: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  addTransferButton: { paddingHorizontal: 4 },
  monthPickerContainer: { width: 140, justifyContent: 'center' },
  monthSelect: { minHeight: 36 },
  scrollContainer: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  rowLayout: { flexDirection: 'row' },
  colLayout: { flexDirection: 'column' },
  cardGrid: { gap: 20, marginBottom: 30 },
  
  summaryCard: { flex: 1, padding: 20, borderRadius: 12, borderWidth: 1, elevation: 2 },
  cardNeutral: { borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
  cardSurplus: { borderColor: sem.surplus.border, backgroundColor: sem.surplus.bg },
  cardDeficit: { borderColor: sem.deficit.border, backgroundColor: sem.deficit.bg },
  cardSettled: { borderColor: sem.settled.border, backgroundColor: sem.settled.bg },
  
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardMemberName: { fontSize: 18, fontWeight: 'bold', color: theme.colors.text.main },
  settledBadge: { backgroundColor: sem.settled.badgeBg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  settledBadgeText: { color: theme.colors.text.inverse, fontSize: 11, fontWeight: 'bold' },
  
  statRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  statLabel: { fontSize: 13, color: theme.colors.text.muted },
  statValue: { fontSize: 14, fontWeight: '600', color: theme.colors.text.main },
  
  transferSummaryBox: { marginTop: 8, padding: 8, backgroundColor: 'rgba(0,0,0,0.03)', borderRadius: 6 },
  transferText: { fontSize: 12, color: theme.colors.text.muted },
  
  cardDivider: { height: 1, backgroundColor: 'rgba(0,0,0,0.05)', marginVertical: 10 },
  balanceLabel: { fontSize: 11, color: theme.colors.text.muted, fontWeight: 'bold' },
  balanceValue: { fontSize: 24, fontWeight: 'bold', marginTop: 4 },
  
  textSurplus: { color: sem.surplus.text },
  textDeficit: { color: sem.deficit.text },
  textNeutral: { color: theme.colors.text.main },
  
  tableContainer: { backgroundColor: theme.colors.surface, padding: 20, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border },
  tableTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 15, color: theme.colors.text.main },
  cellName: { flex: 1.5, minWidth: 100 },
  cellAmount: { flex: 1, textAlign: 'right' },
});