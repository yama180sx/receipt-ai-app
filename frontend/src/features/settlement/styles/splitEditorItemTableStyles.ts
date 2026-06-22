import { StyleSheet } from 'react-native';
import { theme } from '../../../theme';

const sem = theme.colors.semantic;

export const splitEditorItemTableStyles = StyleSheet.create({
  tableScroll: { flex: 1 },
  tableRowWide: { minWidth: 800 },
  totalRow: {
    backgroundColor: sem.warning.bg,
    borderTopWidth: 2,
    borderTopColor: sem.warning.border,
  },
  totalText: { fontWeight: 'bold', color: sem.warning.text },
  totalInputGroup: { borderColor: sem.warning.border, backgroundColor: sem.warning.inputBg },
  totalInputBox: { fontWeight: 'bold', color: sem.warning.text },
  totalUnitText: { color: sem.warning.text, fontWeight: 'bold' },
  cellName: { width: 160 },
  cellAmount: { width: 90, textAlign: 'right' },
  cellInputCol: { width: 180, alignItems: 'center' },
  dualInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 6,
    height: 36,
    paddingRight: 4,
  },
  inputBox: {
    height: '100%',
    textAlign: 'right',
    fontSize: 14,
    color: theme.colors.text.main,
    paddingRight: 4,
  },
  percentBox: { width: 35 },
  amountBox: { width: 60 },
  disabledInputBox: { backgroundColor: sem.neutral.bg, color: theme.colors.text.muted },
  unitText: { fontSize: 11, color: theme.colors.text.muted },
  cellAction: { width: 70, alignItems: 'center' },
});
