import { StyleSheet } from 'react-native';
import { colors } from '../../../theme/colors';
import { borderRadius } from '../../../theme/radii';
import { screenLayout } from '../../../theme/screenLayout';
import { spacing } from '../../../theme/spacing';
import { typography } from '../../../theme/typography';

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
    ...typography.caption,
    color: colors.text.muted,
    letterSpacing: 0.5,
  },
  headerTitle: {
    ...typography.h1,
    color: colors.text.main,
    marginTop: spacing.xs,
  },
  summaryCard: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
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
    color: colors.text.inverse,
    fontSize: 20,
    marginRight: spacing.xs,
    fontWeight: 'bold',
  },
  summaryAmount: {
    color: colors.text.inverse,
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
    color: colors.text.inverse,
    fontSize: 14,
    fontWeight: '600',
  },
  acceptanceBanner: {
    backgroundColor: colors.semantic.surplus.bg,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.semantic.surplus.border,
  },
  acceptanceBannerText: {
    color: colors.semantic.surplus.text,
    fontSize: 14,
    fontWeight: '600',
  },
  captureButton: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: 'dashed',
  },
  captureButtonBody: {
    flex: 1,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  captureButtonText: {
    ...typography.h2,
    color: colors.primary,
  },
  captureSubText: {
    fontSize: 12,
    color: colors.text.muted,
    marginTop: spacing.xs,
  },
  captureCountBadge: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  captureCountBadgeText: {
    color: colors.text.inverse,
    fontSize: 12,
    fontWeight: '700',
  },
  traySection: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  traySectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  trayOpenLink: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  gridCountBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  gridCountBadgeText: {
    color: colors.text.inverse,
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
    ...typography.h2,
    color: colors.text.main,
    marginBottom: spacing.sm,
  },
  settingsIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.background,
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
    ...typography.h2,
    color: colors.primary,
    fontWeight: 'bold',
  },
  dateText: {
    ...typography.caption,
    color: colors.text.muted,
  },
  sourcePickerActions: {
    gap: 10,
    width: '100%',
  },
  loadingIndicator: {
    marginTop: 10,
  },
  adminListItem: {
    backgroundColor: colors.semantic.icon.adminSettings,
  },
});
