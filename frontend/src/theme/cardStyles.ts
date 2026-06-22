import { StyleSheet, Platform } from 'react-native';
import { colors } from './colors';
import { borderRadius } from './radii';
import { spacing } from './spacing';

/** Issue #100-6 (#430): カード・セクションの共通スタイル */
export const cardStyles = StyleSheet.create({
  section: {
    marginBottom: spacing.lg,
  },
  summaryCard: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    ...Platform.select({
      android: { elevation: 3 },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
      },
      default: {},
    }),
  },
  chartCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 220,
    justifyContent: 'center',
  },
});
