import { StyleSheet } from 'react-native';
import { colors } from './colors';
import { borderRadius } from './radii';
import { spacing } from './spacing';
import { typography } from './typography';

/** Issue #85: フォーム入力・ラベル・エラー表示の共通スタイル */
export const formStyles = StyleSheet.create({
  field: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.main,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    fontSize: 14,
    color: colors.text.main,
    minHeight: 48,
  },
  inputFocused: {
    borderColor: colors.primary,
  },
  inputError: {
    borderColor: colors.error,
    backgroundColor: colors.semantic.deficit.bg,
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: 'top',
    paddingTop: spacing.md,
  },
  /** プロンプト編集ペイン等: 親 flex 内で縦に伸ばす */
  textAreaFill: {
    flex: 1,
    minHeight: 120,
    textAlignVertical: 'top',
    paddingTop: spacing.md,
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
    marginTop: spacing.xs,
  },
  /** 単位付き入力の内側（外枠は modalStyles.inputWithUnit） */
  inputInline: {
    flex: 1,
    borderWidth: 0,
    backgroundColor: 'transparent',
    minHeight: 40,
    paddingVertical: 8,
    paddingHorizontal: spacing.sm,
    fontSize: 16,
    color: colors.text.main,
  },
});
