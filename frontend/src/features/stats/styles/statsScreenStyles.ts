import { StyleSheet } from 'react-native';
import { borderRadius, spacing, theme } from '../../../theme';

/** Issue #100-8 (#432): 統計画面の固有スタイル（screenLayout / cardStyles 準拠） */
export const statsScreenStyles = StyleSheet.create({
  topInfo: {
    marginBottom: spacing.md,
  },
  headerSubtitle: {
    fontSize: 10,
    color: theme.colors.text.muted,
    letterSpacing: 1,
  },
  monthPickerContainer: {
    marginTop: spacing.sm,
    justifyContent: 'center',
  },
  monthPickerContainerMobile: {
    width: '100%',
    alignSelf: 'stretch',
  },
  monthPickerContainerWide: {
    width: 180,
  },
  dashboardGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  leftColumn: {
    flex: 1.2,
    marginRight: spacing.lg,
  },
  rightColumn: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
    paddingLeft: spacing.sm,
  },
  summaryLabel: {
    fontSize: 12,
    color: theme.colors.text.muted,
  },
  totalValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginVertical: spacing.xs,
  },
  comparisonRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  comparisonLabel: {
    fontSize: 12,
    marginRight: spacing.sm,
  },
  diffValue: {
    fontWeight: '700',
    fontSize: 16,
  },
  statsCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  trendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.background,
  },
  trendPeriod: {
    flex: 1,
    fontWeight: '700',
  },
  trendAmount: {
    flex: 1,
    textAlign: 'right',
  },
  trendDiff: {
    flex: 1,
    textAlign: 'right',
    fontSize: 12,
    fontWeight: '600',
  },
  paretoWrapper: {
    marginBottom: spacing.md - 4,
  },
  paretoTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  paretoName: {
    fontWeight: '700',
    fontSize: 14,
  },
  paretoValue: {
    fontSize: 12,
    color: theme.colors.text.muted,
  },
  paretoBarContainer: {
    height: 16,
    backgroundColor: theme.colors.semantic.chart.barBg,
    borderRadius: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  paretoBar: {
    height: '100%',
  },
  cumText: {
    fontSize: 10,
    position: 'absolute',
    right: spacing.sm,
    fontWeight: '700',
    color: theme.colors.text.main,
  },
  noDataText: {
    fontSize: 12,
    color: theme.colors.text.muted,
  },
  receiptPreviewCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  receiptImage: {
    width: '100%',
    height: 160,
    backgroundColor: theme.colors.border,
  },
  receiptInfoOverlay: {
    padding: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 60,
  },
  receiptStoreName: {
    fontWeight: '700',
    color: theme.colors.text.main,
  },
  receiptAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.primary,
    minWidth: 80,
    textAlign: 'right',
  },
  taxSubText: {
    fontSize: 11,
    color: theme.colors.text.muted,
    marginTop: 2,
  },
  noImageBox: {
    height: 100,
    backgroundColor: theme.colors.border,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingIndicator: {
    marginTop: 50,
  },
  headerSpacer: {
    width: 40,
  },
  receiptInfoMain: {
    flex: 1,
    marginRight: 10,
  },
});
