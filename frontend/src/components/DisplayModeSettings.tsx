import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { theme } from '../theme';
import { useDisplayMode } from '../contexts/DisplayModeContext';
import type { DisplayLayoutMode } from '../services/displayModeService';

const OPTIONS: { value: DisplayLayoutMode; label: string }[] = [
  { value: 'auto', label: '自動' },
  { value: 'mobile', label: 'スマホ' },
  { value: 'web', label: 'Web' },
];

export function DisplayModeSettings() {
  const { mode, setMode } = useDisplayMode();

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>表示</Text>
      <View style={styles.row}>
        {OPTIONS.map((opt) => {
          const active = mode === opt.value;
          return (
            <TouchableOpacity
              key={opt.value}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => void setMode(opt.value)}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  label: {
    fontSize: 11,
    color: theme.colors.text.muted,
    marginRight: 2,
  },
  row: {
    flexDirection: 'row',
    gap: 4,
  },
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  chipActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary,
  },
  chipText: {
    fontSize: 11,
    color: theme.colors.text.main,
  },
  chipTextActive: {
    color: theme.colors.text.inverse,
    fontWeight: '600',
  },
});
