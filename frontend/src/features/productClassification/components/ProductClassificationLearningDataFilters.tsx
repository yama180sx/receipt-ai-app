import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { ProductClassificationLearningDataType } from '../../../api/generated';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';

type Props = { value: ProductClassificationLearningDataType | 'all'; onChange: (value: ProductClassificationLearningDataType | 'all') => void };

const options: Array<{ label: string; value: ProductClassificationLearningDataType | 'all' }> = [
  { label: 'すべて', value: 'all' }, { label: '世帯辞書', value: 'household_dictionary' },
  { label: '別名', value: 'alias' }, { label: '確定履歴', value: 'history' },
];

export const ProductClassificationLearningDataFilters: React.FC<Props> = ({ value, onChange }) => <View style={styles.row}>
  {options.map((option) => <TouchableOpacity key={option.value} onPress={() => onChange(option.value)} style={[styles.chip, value === option.value && styles.active]}>
    <Text style={[styles.label, value === option.value && styles.activeLabel]}>{option.label}</Text>
  </TouchableOpacity>)}
</View>;

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
  chip: { borderWidth: 1, borderColor: colors.border, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 6 },
  active: { backgroundColor: colors.primary, borderColor: colors.primary },
  label: { color: colors.text.main, fontSize: 12 }, activeLabel: { color: colors.text.inverse, fontWeight: '700' },
});
