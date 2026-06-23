import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AppFormField, AppTextInput } from '../../../components/ui';
import { modalStyles } from '../../../theme/modalStyles';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';
import { cardStyles } from '../../../theme/cardStyles';
import type { ReceiptScanFlow } from '../hooks/useReceiptScan';

const c = colors;
const s = colors.semantic.scan;

type Props = {
  scan: ReceiptScanFlow;
};

export function ReceiptScanForm({ scan }: Props) {
  return (
    <View style={[cardStyles.chartCard, styles.card]}>
      <Text style={styles.sectionLabel}>基本情報</Text>
      <AppFormField label="店舗名">
        <AppTextInput
          value={scan.receiptData.storeName}
          onChangeText={(val) => scan.setReceiptData({ ...scan.receiptData, storeName: val })}
          placeholder="店舗名"
        />
      </AppFormField>
      <AppFormField label="購入日時">
        <AppTextInput
          value={scan.receiptData.purchaseDate}
          onChangeText={(val) => scan.setReceiptData({ ...scan.receiptData, purchaseDate: val })}
          placeholder="YYYY-MM-DD HH:mm"
        />
      </AppFormField>

      <AppFormField label="消費税 (外税・加算額)">
        <View style={modalStyles.inputWithUnit}>
          <AppTextInput
            variant="inline"
            value={String(scan.receiptData.taxAmount)}
            keyboardType="decimal-pad"
            onChangeText={(val) => scan.setReceiptData({ ...scan.receiptData, taxAmount: val })}
          />
          <Text style={modalStyles.unitSuffix}>円</Text>
        </View>
      </AppFormField>

      <View style={styles.totalDisplay}>
        <Text style={styles.totalLabel}>支払合計 (税込)</Text>
        <Text style={styles.totalValue}>¥ {scan.calculatedTotal.toLocaleString()}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { minHeight: undefined, alignItems: 'stretch', margin: spacing.md, marginTop: 0, elevation: 2 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: s.textMuted,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  totalDisplay: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: s.borderInput,
  },
  totalLabel: { fontSize: 14, color: s.textSecondary },
  totalValue: { fontSize: 24, fontWeight: 'bold', color: c.primary },
});
