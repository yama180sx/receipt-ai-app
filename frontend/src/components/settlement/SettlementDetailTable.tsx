import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme, tableStyles } from '../../theme';
import type { SettlementMemberSummary } from '../../types/settlement';

interface SettlementDetailTableProps {
  summaryData: SettlementMemberSummary[];
}

export const SettlementDetailTable: React.FC<SettlementDetailTableProps> = ({
  summaryData,
}) => {
  const sem = theme.colors.semantic;

  return (
    <View style={styles.tableContainer}>
      <Text style={styles.tableTitle}>📋 世帯内精算内訳（一覧）</Text>
      <View style={tableStyles.wrapper}>
        <View style={[tableStyles.row, tableStyles.headerRow]}>
          <Text style={[tableStyles.cell, styles.cellName, tableStyles.headerText]}>
            メンバー名
          </Text>
          <Text style={[tableStyles.cell, styles.cellAmount, tableStyles.headerText]}>
            立替金額(A)
          </Text>
          <Text style={[tableStyles.cell, styles.cellAmount, tableStyles.headerText]}>
            負担金額(B)
          </Text>
          <Text style={[tableStyles.cell, styles.cellAmount, tableStyles.headerText]}>
            差額(A-B)
          </Text>
          <Text style={[tableStyles.cell, styles.cellAmount, tableStyles.headerText]}>
            送金/受取相殺
          </Text>
          <Text style={[tableStyles.cell, styles.cellAmount, tableStyles.headerText]}>
            最終残額
          </Text>
        </View>

        {summaryData.map((m) => {
          const balanceStyle =
            m.balance > 0
              ? styles.textSurplus
              : m.balance < 0
                ? styles.textDeficit
                : styles.textNeutral;
          const offsetAmount = (m.transferredOut || 0) - (m.transferredIn || 0);

          return (
            <View key={m.memberId} style={tableStyles.row}>
              <Text
                style={[
                  tableStyles.cell,
                  styles.cellName,
                  tableStyles.bodyText,
                  tableStyles.boldText,
                ]}
              >
                {m.name}
              </Text>
              <Text style={[tableStyles.cell, styles.cellAmount, tableStyles.bodyText]}>
                ¥{m.totalPaid?.toLocaleString()}
              </Text>
              <Text style={[tableStyles.cell, styles.cellAmount, tableStyles.bodyText]}>
                ¥{m.totalOwed?.toLocaleString()}
              </Text>
              <Text style={[tableStyles.cell, styles.cellAmount, tableStyles.bodyText]}>
                {m.baseBalance >= 0 ? '+' : ''}
                {m.baseBalance?.toLocaleString()}
              </Text>
              <Text
                style={[
                  tableStyles.cell,
                  styles.cellAmount,
                  tableStyles.bodyText,
                  { color: theme.colors.text.muted },
                ]}
              >
                {offsetAmount >= 0 ? '+' : ''}
                {offsetAmount.toLocaleString()}
              </Text>
              <Text
                style={[
                  tableStyles.cell,
                  styles.cellAmount,
                  balanceStyle,
                  tableStyles.boldText,
                ]}
              >
                {m.balance > 0 ? '+' : ''}
                {m.balance?.toLocaleString()}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const sem = theme.colors.semantic;

const styles = StyleSheet.create({
  tableContainer: {
    backgroundColor: theme.colors.surface,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  tableTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 15, color: theme.colors.text.main },
  cellName: { flex: 1.5, minWidth: 100 },
  cellAmount: { flex: 1, textAlign: 'right' },
  textSurplus: { color: sem.surplus.text },
  textDeficit: { color: sem.deficit.text },
  textNeutral: { color: theme.colors.text.main },
});
