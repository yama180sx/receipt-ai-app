import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { AppButton, AppFormField, AppSelect, AppTextInput } from '../../../components/ui';
import { BUTTON_LABELS } from '../../../constants/buttonLabels';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';
import { cardStyles } from '../../../theme/cardStyles';
import type { ReceiptScanFlow } from '../hooks/useReceiptScan';

const c = colors;
const s = colors.semantic.scan;

type Props = {
  scan: ReceiptScanFlow;
};

export function ReceiptScanItemList({ scan }: Props) {
  return (
    <>
      <View style={styles.itemsHeader}>
        <Text style={styles.sectionLabel}>商品明細 ({scan.receiptData.items.length})</Text>
        <AppButton
          title={`+ ${BUTTON_LABELS.add}`}
          onPress={scan.addItem}
          variant="outline"
          size="sm"
        />
      </View>

      {scan.receiptData.items.map((item, idx) => (
        <View key={idx} style={[cardStyles.chartCard, styles.itemCard]}>
          <View style={styles.itemHeaderRow}>
            <AppTextInput
              style={styles.itemNameInput}
              value={item.name}
              onChangeText={(val) => scan.updateItem(idx, 'name', val)}
              placeholder="商品名"
            />
            <TouchableOpacity onPress={() => scan.removeItem(idx)}>
              <Text style={styles.deleteIcon}>🗑️</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.itemDetailRow}>
            <View style={styles.itemSubGroup}>
              <Text style={styles.subLabel}>単価 (¥)</Text>
              <AppTextInput
                value={String(item.price)}
                keyboardType="decimal-pad"
                onChangeText={(val) => scan.updateItem(idx, 'price', val)}
              />
            </View>
            <View style={[styles.itemSubGroup, { flex: 0.6 }]}>
              <Text style={styles.subLabel}>数量</Text>
              <AppTextInput
                value={String(item.quantity)}
                keyboardType="decimal-pad"
                onChangeText={(val) => scan.updateItem(idx, 'quantity', val)}
              />
            </View>
            <View style={[styles.itemSubGroup, { alignItems: 'flex-end' }]}>
              <Text style={styles.subLabel}>小計</Text>
              <Text style={styles.subTotalText}>
                ¥{' '}
                {Math.round(
                  (parseFloat(String(item.price)) || 0) * (parseFloat(String(item.quantity)) || 0)
                ).toLocaleString()}
              </Text>
            </View>
          </View>

          <AppFormField label="カテゴリ">
            <AppSelect<number | null>
              selectedValue={item.categoryId}
              onValueChange={(val) => scan.updateItem(idx, 'categoryId', val)}
              options={scan.categorySelectOptions}
              placeholder="未選択"
            />
          </AppFormField>
        </View>
      ))}
      <View style={{ height: 60 }} />
    </>
  );
}

const styles = StyleSheet.create({
  itemsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: spacing.md,
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: s.textMuted,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  itemCard: {
    minHeight: undefined,
    alignItems: 'stretch',
    marginHorizontal: spacing.md,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: c.primary,
    elevation: 1,
  },
  itemHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  itemNameInput: { flex: 1, marginRight: 8 },
  deleteIcon: { fontSize: 18, color: s.deleteIcon },
  itemDetailRow: { flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: 12 },
  itemSubGroup: { flex: 1 },
  subLabel: { fontSize: 10, color: s.textMuted, fontWeight: 'bold', marginBottom: 4 },
  subTotalText: { fontSize: 14, fontWeight: '700', color: s.textItem, paddingTop: 4 },
});
