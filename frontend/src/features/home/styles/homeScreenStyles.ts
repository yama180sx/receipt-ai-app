import { StyleSheet } from 'react-native';
import { screenLayout, spacing, theme } from '../../../theme';

/** Issue #100-9 (#433): ホーム画面の固有スタイル（screenLayout / cardStyles 準拠） */
export const homeScreenStyles = StyleSheet.create({
  container: screenLayout.container,
  scrollContent: {
    ...screenLayout.scrollContent,
    paddingBottom: 40,
  },
  header: {
    marginBottom: spacing.lg,
    marginTop: spacing.md,
  },
  headerDev: {
    borderLeftWidth: 4,
    borderLeftColor: '#b45309',
    paddingLeft: spacing.sm,
  },
  headerSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.text.muted,
    letterSpacing: 0.5,
  },
  headerTitle: {
    ...theme.typography.h1,
    color: theme.colors.text.main,
    marginTop: spacing.xs,
  },
  summaryCard: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    marginBottom: spacing.lg,
    elevation: 4,
  },
  summaryLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontWeight: '600',
  },
  summaryAmountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 5,
  },
  summarySymbol: {
    color: theme.colors.text.inverse,
    fontSize: 20,
    marginRight: spacing.xs,
    fontWeight: 'bold',
  },
  summaryAmount: {
    color: theme.colors.text.inverse,
    fontSize: 36,
    fontWeight: 'bold',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginVertical: spacing.md,
  },
  summaryLinkButton: {
    alignSelf: 'flex-end',
    marginTop: spacing.xs,
    backgroundColor: 'transparent',
    borderColor: 'rgba(255,255,255,0.7)',
  },
  summaryLinkText: {
    color: theme.colors.text.inverse,
    fontSize: 14,
    fontWeight: '600',
  },
  acceptanceBanner: {
    backgroundColor: theme.colors.semantic.surplus.bg,
    borderRadius: theme.borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.semantic.surplus.border,
  },
  acceptanceBannerText: {
    color: theme.colors.semantic.surplus.text,
    fontSize: 14,
    fontWeight: '600',
  },
  captureButton: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    borderStyle: 'dashed',
  },
  captureButtonBody: {
    flex: 1,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  captureButtonText: {
    ...theme.typography.h2,
    color: theme.colors.primary,
  },
  captureSubText: {
    fontSize: 12,
    color: theme.colors.text.muted,
    marginTop: spacing.xs,
  },
  captureCountBadge: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  captureCountBadgeText: {
    color: theme.colors.text.inverse,
    fontSize: 12,
    fontWeight: '700',
  },
  traySection: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  traySectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  trayOpenLink: {
    color: theme.colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  gridCountBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  gridCountBadgeText: {
    color: theme.colors.text.inverse,
    fontSize: 11,
    fontWeight: '700',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  gridCard: {
    flexGrow: 1,
    minWidth: 100,
    flexBasis: '30%',
  },
  gridEmoji: {
    fontSize: 28,
  },
  section: {
    marginTop: spacing.lg,
  },
  sectionTitle: {
    ...theme.typography.h2,
    color: theme.colors.text.main,
    marginBottom: spacing.sm,
  },
  settingsIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  latestCard: {
    marginBottom: 0,
  },
  latestCardEmpty: {
    marginBottom: 0,
    justifyContent: 'center',
  },
  amountText: {
    ...theme.typography.h2,
    color: theme.colors.primary,
    fontWeight: 'bold',
  },
  dateText: {
    ...theme.typography.caption,
    color: theme.colors.text.muted,
  },
  sourcePickerActions: {
    gap: 10,
    width: '100%',
  },
  loadingIndicator: {
    marginTop: 10,
  },
  adminListItem: {
    backgroundColor: theme.colors.semantic.icon.adminSettings,
  },
});
