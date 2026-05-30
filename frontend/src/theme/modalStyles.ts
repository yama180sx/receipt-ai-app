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
    overflow: 'hidden',
  },
  selectWrapperError: {
    borderColor: colors.error,
    backgroundColor: colors.semantic.deficit.bg,
  },
  selectPicker: {
    width: '100%',
    height: 40,
    ...Platform.select({ web: { outlineStyle: 'none', border: 'none' } as object }),
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
});
