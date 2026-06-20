import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppButton } from '../../../components/ui';
import { BUTTON_LABELS } from '../../../constants/buttonLabels';
import { theme } from '../../../theme';
import { formatTransferDate } from '../../../utils/settlementFormat';
import type { SettlementTransfer } from '../../../types/settlement';

interface SettlementTransferHistoryProps {
  selectedMonth: string;
  transfers: SettlementTransfer[];
  memberNameById: Map<number, string>;
  cancellingTransferId: number | null;
  onCancelTransfer: (transfer: SettlementTransfer) => void;
}

export const SettlementTransferHistory: React.FC<SettlementTransferHistoryProps> = ({
  selectedMonth,
  transfers,
  memberNameById,
  cancellingTransferId,
  onCancelTransfer,
}) => (
  <View style={styles.transferHistoryContainer}>
    <Text style={styles.tableTitle}>💸 送金履歴（{selectedMonth}）</Text>
    {transfers.length === 0 ? (
      <Text style={styles.transferHistoryEmpty}>
        この月に登録された送金はありません。
      </Text>
    ) : (
      transfers.map((t) => {
        const fromName =
          memberNameById.get(t.fromMemberId) ?? `ID:${t.fromMemberId}`;
        const toName =
          memberNameById.get(t.toMemberId) ?? `ID:${t.toMemberId}`;
        const isCancelling = cancellingTransferId === t.id;

        return (
          <View key={t.id} style={styles.transferHistoryRow}>
            <View style={styles.transferHistoryMain}>
              <Text style={styles.transferHistoryLine}>
                {fromName} → {toName}
              </Text>
              <Text style={styles.transferHistoryMeta}>
                ¥{t.amount.toLocaleString()} · {formatTransferDate(t.settledAt)}
              </Text>
            </View>
            <AppButton
              title={BUTTON_LABELS.cancelTransfer}
              onPress={() => onCancelTransfer(t)}
              variant="danger"
              size="sm"
              loading={isCancelling}
              disabled={cancellingTransferId !== null}
            />
          </View>
        );
      })
    )}
  </View>
);

const styles = StyleSheet.create({
  transferHistoryContainer: {
    marginTop: 24,
    backgroundColor: theme.colors.surface,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  tableTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 15, color: theme.colors.text.main },
  transferHistoryEmpty: {
    fontSize: 14,
    color: theme.colors.text.muted,
  },
  transferHistoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  transferHistoryMain: { flex: 1, minWidth: 0 },
  transferHistoryLine: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text.main,
  },
  transferHistoryMeta: {
    fontSize: 13,
    color: theme.colors.text.muted,
    marginTop: 4,
  },
});
