import { StyleSheet, Platform } from 'react-native';
import { colors } from './colors';
import { borderRadius } from './radii';
import { spacing } from './spacing';

/** Issue #85: ダイアログ型モーダル・セレクト枠の共通スタイル */
export const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialog: {
    backgroundColor: colors.surface,
    width: 400,
    maxWidth: '90%',
    padding: 25,
    borderRadius: borderRadius.md,
    ...Platform.select({
      android: { elevation: 5 },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      default: {},
    }),
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.main,
    marginBottom: 5,
  },
  description: {
    fontSize: 13,
    color: colors.text.muted,
    marginBottom: 20,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
    gap: 10,
  },
  footerPrimaryButton: {
    minWidth: 100,
  },
  selectWrapper: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surface,
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    ...Platform.select({
      android: { overflow: 'visible' as const },
      ios: { overflow: 'visible' as const },
      default: { overflow: 'hidden' as const },
    }),
  },
  selectWrapperError: {
    borderColor: colors.error,
    backgroundColor: colors.semantic.deficit.bg,
  },
  /** ネイティブ: タップで開く選択 UI（Picker の文字切れ回避） */
  selectTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
    paddingVertical: spacing.xs,
  },
  selectTriggerText: {
    flex: 1,
    fontSize: 14,
    color: colors.text.main,
    marginRight: spacing.sm,
  },
  selectChevron: {
    fontSize: 10,
    color: colors.text.muted,
  },
  selectOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  selectSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.md,
    borderTopRightRadius: borderRadius.md,
    maxHeight: '55%',
    paddingBottom: spacing.lg,
    ...Platform.select({
      android: { elevation: 8 },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
      },
      default: {},
    }),
  },
  selectOptionRow: {
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  selectOptionRowSelected: {
    backgroundColor: colors.semantic.active.bg,
  },
  selectOptionText: {
    fontSize: 16,
    color: colors.text.main,
  },
  selectOptionTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  inputWithUnit: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surface,
    minHeight: 48,
    paddingRight: spacing.md,
  },
  unitSuffix: {
    fontSize: 14,
    color: colors.text.muted,
    marginLeft: spacing.sm,
  },
  webSelect: {
    width: '100%',
    height: 40,
    borderWidth: 0,
    backgroundColor: 'transparent',
    paddingLeft: spacing.xs,
    fontSize: 13,
    color: colors.text.main,
    ...Platform.select({ web: { outlineStyle: 'none' } as object }),
  },
  /** フルスクリーン sheet（履歴詳細等） */
  sheetContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheetWide: {
    width: '95%',
    maxWidth: 1400,
    height: '90%',
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    ...Platform.select({
      android: { elevation: 8 },
      default: {},
    }),
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  sheetHeaderTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.main,
    marginRight: spacing.sm,
  },
  sheetBody: {
    flex: 1,
  },
});
