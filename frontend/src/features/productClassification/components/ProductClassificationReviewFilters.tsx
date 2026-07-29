import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AppSelect, type AppSelectOption } from '../../../components/ui';
import type { ProductTypeStatus } from '../../../api/generated';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';

type Props = {
  statuses: ProductTypeStatus[];
  statusOptions: Array<{ label: string; value: ProductTypeStatus }>;
  categoryId: number | null;
  categoryOptions: AppSelectOption<number>[];
  month: string;
  monthOptions: AppSelectOption<string>[];
  onToggleStatus: (status: ProductTypeStatus) => void;
  onCategoryChange: (categoryId: number | null) => void;
  onMonthChange: (month: string) => void;
};

export const ProductClassificationReviewFilters: React.FC<Props> = ({
  statuses, statusOptions, categoryId, categoryOptions, month, monthOptions,
  onToggleStatus, onCategoryChange, onMonthChange,
}) => <View style={styles.container}>
  <Text style={styles.label}>状態</Text>
  <View style={styles.statuses}>{statusOptions.map((option) => {
    const selected = statuses.includes(option.value);
    return <TouchableOpacity key={option.value} onPress={() => onToggleStatus(option.value)}
      style={[styles.status, selected && styles.statusSelected]} accessibilityRole="checkbox" accessibilityState={{ checked: selected }}>
      <Text style={[styles.statusText, selected && styles.statusTextSelected]}>{option.label}</Text>
    </TouchableOpacity>;
  })}</View>
  <View style={styles.selects}>
    <AppSelect<number | null> selectedValue={categoryId} onValueChange={onCategoryChange} options={categoryOptions} placeholder="全Category" style={styles.select} />
    <AppSelect<string> selectedValue={month} onValueChange={onMonthChange} options={monthOptions} placeholder="全期間" placeholderValue="" style={styles.select} />
  </View>
</View>;

const styles = StyleSheet.create({
  container: { gap: spacing.sm, paddingHorizontal: spacing.md, paddingBottom: spacing.md },
  label: { color: colors.text.main, fontSize: 13, fontWeight: '600' },
  statuses: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  status: { borderWidth: 1, borderColor: colors.border, borderRadius: 16, paddingHorizontal: spacing.sm, paddingVertical: 6 },
  statusSelected: { borderColor: colors.primary, backgroundColor: colors.semantic.active.bg },
  statusText: { color: colors.text.muted, fontSize: 12 }, statusTextSelected: { color: colors.primary, fontWeight: '600' },
  selects: { flexDirection: 'row', gap: spacing.sm }, select: { flex: 1 },
});
