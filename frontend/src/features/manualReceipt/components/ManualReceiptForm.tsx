import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { AppButton, AppFormField, AppSelect, AppTextInput } from '../../../components/ui';
import { cardStyles } from '../../../theme/cardStyles';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';
import type { useManualReceipt } from '../hooks/useManualReceipt';

type Props = { form: ReturnType<typeof useManualReceipt> };

export function ManualReceiptForm({ form }: Props) {
  return (
    <>
      <View style={[cardStyles.chartCard, styles.card]}>
        <Text style={styles.sectionTitle}>基本情報</Text>
        <AppFormField label="登録先メンバー">
          <AppSelect<number | null>
            selectedValue={form.memberId}
            onValueChange={form.setMemberId}
            options={form.members.map((member) => ({ label: member.name, value: member.id }))}
            placeholder="メンバーを選択"
          />
        </AppFormField>
        <AppFormField label="店舗名"><AppTextInput value={form.storeName} onChangeText={form.setStoreName} placeholder="店舗名" /></AppFormField>
        <AppFormField label="購入日"><AppTextInput value={form.date} onChangeText={form.setDate} placeholder="YYYY-MM-DD" /></AppFormField>
      </View>
      <View style={styles.itemsHeader}>
        <Text style={styles.sectionTitle}>商品明細 ({form.items.length})</Text>
        <AppButton title="+ 追加" onPress={form.addItem} variant="outline" size="sm" />
      </View>
      {form.items.map((item, index) => (
        <View key={index} style={[cardStyles.chartCard, styles.itemCard]}>
          <View style={styles.itemHeader}>
            <AppTextInput style={styles.itemName} value={item.name} onChangeText={(value) => form.updateItem(index, 'name', value)} placeholder="商品名" />
            {form.items.length > 1 ? <TouchableOpacity onPress={() => form.removeItem(index)}><Text style={styles.delete}>削除</Text></TouchableOpacity> : null}
          </View>
          <View style={styles.itemRow}>
            <View style={styles.itemField}><Text style={styles.label}>単価 (円)</Text><AppTextInput value={item.price} onChangeText={(value) => form.updateItem(index, 'price', value)} keyboardType="decimal-pad" placeholder="0" /></View>
            <View style={styles.quantityField}><Text style={styles.label}>数量</Text><AppTextInput value={item.quantity} onChangeText={(value) => form.updateItem(index, 'quantity', value)} keyboardType="decimal-pad" placeholder="1" /></View>
          </View>
          <AppFormField label="カテゴリ（任意）"><AppSelect<number | null> selectedValue={item.categoryId} onValueChange={(value) => form.updateItem(index, 'categoryId', value)} options={form.categoryOptions} placeholder="未選択" /></AppFormField>
        </View>
      ))}
      <View style={[cardStyles.chartCard, styles.total]}><Text style={styles.totalLabel}>支払合計</Text><Text style={styles.totalValue}>¥ {Math.round(form.total).toLocaleString()}</Text></View>
      <AppButton title="手入力レシートを登録" onPress={() => void form.save()} loading={form.isSaving} fullWidth style={styles.saveButton} />
    </>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: 'stretch', margin: spacing.md, marginTop: 0 },
  sectionTitle: { fontWeight: 'bold', fontSize: 15, color: colors.text.main, marginBottom: spacing.sm },
  itemsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', margin: spacing.md },
  itemCard: { alignItems: 'stretch', marginHorizontal: spacing.md, marginBottom: spacing.md, borderLeftWidth: 4, borderLeftColor: colors.primary },
  itemHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  itemName: { flex: 1 }, delete: { color: colors.error, fontWeight: 'bold' },
  itemRow: { flexDirection: 'row', gap: spacing.sm }, itemField: { flex: 1 }, quantityField: { flex: 0.55 },
  label: { fontSize: 12, color: colors.text.muted, marginBottom: 4 },
  total: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', margin: spacing.md },
  totalLabel: { fontSize: 16, color: colors.text.muted }, totalValue: { fontSize: 24, fontWeight: 'bold', color: colors.primary },
  saveButton: { margin: spacing.md, marginTop: 0, marginBottom: spacing.xl },
});
