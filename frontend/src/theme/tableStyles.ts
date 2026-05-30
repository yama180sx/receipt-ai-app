import { StyleSheet } from 'react-native';
import { colors } from './colors';
import { spacing } from './spacing';
import { typography } from './typography';

/** Issue #84: データテーブル共通スタイル（精算・割勘エディタ等） */
export const tableStyles = StyleSheet.create({
  wrapper: {
    borderWidth: 1,
    borderColor: colors.semantic.table.rowBorder,
    borderRadius: 8,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.semantic.table.rowBorder,
    alignItems: 'center',
    minHeight: 48,
  },
  headerRow: {
    backgroundColor: colors.semantic.table.headerBg,
    borderBottomColor: colors.border,
  },
  cell: {
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
  },
  headerText: {
    fontWeight: 'bold',
    color: colors.text.muted,
    fontSize: 13,
  },
  bodyText: {
    fontSize: 14,
    color: colors.text.main,
  },
  boldText: {
    fontWeight: 'bold',
  },
});

export const listItemStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  main: {
    flex: 1,
    marginRight: spacing.sm,
  },
  title: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text.main,
  },
  subtitle: {
    fontSize: 13,
    color: colors.text.muted,
    marginTop: 4,
  },
  colorDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginRight: spacing.md,
  },
  chevron: {
    fontSize: 24,
    color: colors.semantic.admin.arrow,
    marginLeft: spacing.sm,
  },
});
