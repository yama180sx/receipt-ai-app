import { StyleSheet } from 'react-native';
import { colors } from './colors';
import { spacing } from './spacing';

/** Issue #100-6 (#430): 画面コンテナ・ヘッダー・スクロールの共通レイアウト */
export const screenLayout = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.main,
  },
  scrollContent: {
    padding: spacing.lg,
  },
});
