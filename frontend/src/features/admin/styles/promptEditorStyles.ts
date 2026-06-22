import { StyleSheet } from 'react-native';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';
import { borderRadius } from '../../../theme/radii';

const adm = colors.semantic.admin;

export const promptEditorStyles = StyleSheet.create({
  containerAdmin: { backgroundColor: adm.background },
  headerAdmin: { backgroundColor: adm.surface, borderBottomColor: adm.border },
  contentContainer: { paddingBottom: 40 },
  center: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: spacing.md - 4, color: adm.textMuted },
  errorContainer: {
    backgroundColor: adm.errorBg,
    padding: spacing.md - 4,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.md,
  },
  errorText: { color: adm.errorText },
  card: {
    backgroundColor: adm.surface,
    marginBottom: spacing.md - 4,
    borderWidth: 2,
    borderColor: adm.border,
  },
  activeCard: { borderColor: colors.primary },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  titleContainer: { flex: 1, paddingRight: spacing.sm },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: adm.textDark, lineHeight: 22 },
  versionText: { fontSize: 12, color: adm.textMuted, fontWeight: 'normal' },
  badgeContainer: { justifyContent: 'flex-start', paddingTop: 2 },
  badge: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  badgeText: { color: colors.text.inverse, fontSize: 10, fontWeight: 'bold' },
  cardDesc: { fontSize: 13, color: adm.textMuted, marginBottom: spacing.md - 4 },
  cardActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, flexWrap: 'wrap' },
  formContainer: {
    backgroundColor: adm.surface,
    borderColor: adm.border,
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  formTitle: { fontSize: 18, fontWeight: 'bold', flex: 1 },
  promptTextArea: { minHeight: 200 },
  jsonTextArea: { minHeight: 150 },
  jsonInputFont: { fontFamily: 'Courier' },
});
