import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../../../theme';
import type { SettlementMemberSummary } from '../../../types/settlement';

interface SettlementMemberCardsProps {
  summaryData: SettlementMemberSummary[];
  isWide: boolean;
}

export const SettlementMemberCards: React.FC<SettlementMemberCardsProps> = ({
  summaryData,
  isWide,
}) => {
  return (
    <View style={[styles.cardGrid, isWide ? styles.rowLayout : styles.colLayout]}>
      {summaryData.map((m) => {
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
              {isSettled && (
                <View style={styles.settledBadge}>
                  <Text style={styles.settledBadgeText}>精算済</Text>
                </View>
              )}
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
                {(m.transferredOut || 0) > 0 && (
                  <Text style={styles.transferText}>
                    ↑ 送金済: ¥{m.transferredOut.toLocaleString()}
                  </Text>
                )}
                {(m.transferredIn || 0) > 0 && (
                  <Text style={styles.transferText}>
                    ↓ 受取済: ¥{m.transferredIn.toLocaleString()}
                  </Text>
                )}
              </View>
            )}

            <View style={styles.cardDivider} />

            {isSettled ? (
              <Text style={[styles.balanceValue, { color: theme.colors.text.muted }]}>
                ¥0 (精算完了)
              </Text>
            ) : (
              <>
                <Text style={styles.balanceLabel}>
                  {isSurplus
                    ? '他メンバーから受け取る残額'
                    : isDeficit
                      ? '他メンバーへ支払う残額'
                      : '精算なし'}
                </Text>
                <Text
                  style={[
                    styles.balanceValue,
                    isSurplus
                      ? styles.textSurplus
                      : isDeficit
                        ? styles.textDeficit
                        : styles.textNeutral,
                  ]}
                >
                  ¥{Math.abs(m.balance || 0).toLocaleString()}
                </Text>
              </>
            )}
          </View>
        );
      })}
    </View>
  );
};

const sem = theme.colors.semantic;

const styles = StyleSheet.create({
  cardGrid: { gap: 20, marginBottom: 30 },
  rowLayout: { flexDirection: 'row' },
  colLayout: { flexDirection: 'column' },
  summaryCard: { flex: 1, padding: 20, borderRadius: 12, borderWidth: 1, elevation: 2 },
  cardNeutral: { borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
  cardSurplus: { borderColor: sem.surplus.border, backgroundColor: sem.surplus.bg },
  cardDeficit: { borderColor: sem.deficit.border, backgroundColor: sem.deficit.bg },
  cardSettled: { borderColor: sem.settled.border, backgroundColor: sem.settled.bg },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardMemberName: { fontSize: 18, fontWeight: 'bold', color: theme.colors.text.main },
  settledBadge: {
    backgroundColor: sem.settled.badgeBg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  settledBadgeText: { color: theme.colors.text.inverse, fontSize: 11, fontWeight: 'bold' },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  statLabel: { fontSize: 13, color: theme.colors.text.muted },
  statValue: { fontSize: 14, fontWeight: '600', color: theme.colors.text.main },
  transferSummaryBox: {
    marginTop: 8,
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: 6,
  },
  transferText: { fontSize: 12, color: theme.colors.text.muted },
  cardDivider: { height: 1, backgroundColor: 'rgba(0,0,0,0.05)', marginVertical: 10 },
  balanceLabel: { fontSize: 11, color: theme.colors.text.muted, fontWeight: 'bold' },
  balanceValue: { fontSize: 24, fontWeight: 'bold', marginTop: 4 },
  textSurplus: { color: sem.surplus.text },
  textDeficit: { color: sem.deficit.text },
  textNeutral: { color: theme.colors.text.main },
});
