import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
} from 'react-native';
import { AppButton } from '../../../components/ui';
import { BUTTON_LABELS } from '../../../constants/buttonLabels';
import { theme, tableStyles } from '../../../theme';
import { calcItemTotal } from '../../../utils/splitEditorSplits';
import { webTextInputOutlineNone } from '../../../utils/webPlatformStyles';
import type {
  FamilyMemberSummary,
  ReceiptForSplitEditor,
  ReceiptItemForSplit,
} from '../../../types/settlement';

interface SplitEditorItemTableProps {
  receipt: ReceiptForSplitEditor;
  activeMembers: FamilyMemberSummary[];
  editSplits: Record<number, Record<number, number>>;
  receiptTotalAmount: number;
  onAmountChange: (
    itemId: number,
    memberId: number,
    value: string,
    itemTotal: number
  ) => void;
  onPercentChange: (
    itemId: number,
    memberId: number,
    value: string,
    itemTotal: number
  ) => void;
  onSplitItemEqually: (itemId: number, itemTotal: number) => void;
  onTotalAmountChange: (memberId: number, value: string) => void;
  onTotalPercentChange: (memberId: number, value: string) => void;
  onSplitWholeReceiptEqually: () => void;
  getMemberTotalAmount: (memberId: number) => number;
}

export const SplitEditorItemTable: React.FC<SplitEditorItemTableProps> = ({
  receipt,
  activeMembers,
  editSplits,
  receiptTotalAmount,
  onAmountChange,
  onPercentChange,
  onSplitItemEqually,
  onTotalAmountChange,
  onTotalPercentChange,
  onSplitWholeReceiptEqually,
  getMemberTotalAmount,
}) => {
  const sem = theme.colors.semantic;

  return (
    <ScrollView style={styles.tableScroll} horizontal={false}>
      <ScrollView horizontal contentContainerStyle={{ flexDirection: 'column' }}>
        <View style={tableStyles.wrapper}>
          <View style={[tableStyles.row, tableStyles.headerRow, styles.tableRowWide]}>
            <Text style={[tableStyles.cell, styles.cellName, tableStyles.headerText]}>
              商品名
            </Text>
            <Text style={[tableStyles.cell, styles.cellAmount, tableStyles.headerText]}>
              合計
            </Text>
            {activeMembers.map((m) => (
              <Text
                key={m.id}
                style={[
                  tableStyles.cell,
                  styles.cellInputCol,
                  tableStyles.headerText,
                  { textAlign: 'center' },
                ]}
              >
                {m.name}
              </Text>
            ))}
            <Text style={[tableStyles.cell, styles.cellAction, tableStyles.headerText]}>
              操作
            </Text>
          </View>

          {receipt.items.map((item: ReceiptItemForSplit) => {
            const itemTotal = calcItemTotal(item);

            return (
              <View key={item.id} style={[tableStyles.row, styles.tableRowWide]}>
                <Text
                  style={[tableStyles.cell, styles.cellName, tableStyles.bodyText]}
                  numberOfLines={2}
                >
                  {item.name}
                </Text>
                <Text
                  style={[
                    tableStyles.cell,
                    styles.cellAmount,
                    tableStyles.bodyText,
                    tableStyles.boldText,
                  ]}
                >
                  ¥{itemTotal.toLocaleString()}
                </Text>

                {activeMembers.map((m, idx) => {
                  const amountValue = editSplits[item.id]?.[m.id] || 0;
                  const percentValue =
                    itemTotal > 0 ? Math.round((amountValue / itemTotal) * 100) : 0;
                  const isFirst = idx === 0;

                  return (
                    <View key={m.id} style={[tableStyles.cell, styles.cellInputCol]}>
                      <View style={styles.dualInputWrapper}>
                        <View style={styles.inputGroup}>
                          <TextInput
                            style={[
                              styles.inputBox,
                              styles.percentBox,
                              isFirst && styles.disabledInputBox,
                            ]}
                            value={String(percentValue)}
                            onChangeText={(val) =>
                              onPercentChange(item.id, m.id, val, itemTotal)
                            }
                            keyboardType="number-pad"
                            editable={!isFirst}
                            selectTextOnFocus
                          />
                          <Text style={styles.unitText}>%</Text>
                        </View>

                        <View style={[styles.inputGroup, { marginLeft: 4 }]}>
                          <TextInput
                            style={[
                              styles.inputBox,
                              styles.amountBox,
                              isFirst && styles.disabledInputBox,
                            ]}
                            value={String(amountValue)}
                            onChangeText={(val) =>
                              onAmountChange(item.id, m.id, val, itemTotal)
                            }
                            keyboardType="number-pad"
                            editable={!isFirst}
                            selectTextOnFocus
                          />
                          <Text style={styles.unitText}>円</Text>
                        </View>
                      </View>
                    </View>
                  );
                })}

                <View style={[tableStyles.cell, styles.cellAction]}>
                  <AppButton
                    title={BUTTON_LABELS.splitEqual}
                    onPress={() => onSplitItemEqually(item.id, itemTotal)}
                    variant="ghost"
                    size="sm"
                  />
                </View>
              </View>
            );
          })}

          <View style={[tableStyles.row, styles.tableRowWide, styles.totalRow]}>
            <Text style={[tableStyles.cell, styles.cellName, styles.totalText]}>
              一括調整（全体合計）
            </Text>
            <Text style={[tableStyles.cell, styles.cellAmount, styles.totalText]}>
              ¥{receiptTotalAmount.toLocaleString()}
            </Text>

            {activeMembers.map((m, idx) => {
              const memberTotal = getMemberTotalAmount(m.id);
              const percentValue =
                receiptTotalAmount > 0
                  ? Math.round((memberTotal / receiptTotalAmount) * 100)
                  : 0;
              const isFirst = idx === 0;

              return (
                <View key={m.id} style={[tableStyles.cell, styles.cellInputCol]}>
                  <View style={styles.dualInputWrapper}>
                    <View style={[styles.inputGroup, styles.totalInputGroup]}>
                      <TextInput
                        style={[
                          styles.inputBox,
                          styles.percentBox,
                          isFirst && styles.disabledInputBox,
                          styles.totalInputBox,
                        ]}
                        value={String(percentValue)}
                        onChangeText={(val) => onTotalPercentChange(m.id, val)}
                        keyboardType="number-pad"
                        editable={!isFirst}
                        selectTextOnFocus
                      />
                      <Text style={[styles.unitText, styles.totalUnitText]}>%</Text>
                    </View>

                    <View
                      style={[styles.inputGroup, styles.totalInputGroup, { marginLeft: 4 }]}
                    >
                      <TextInput
                        style={[
                          styles.inputBox,
                          styles.amountBox,
                          isFirst && styles.disabledInputBox,
                          styles.totalInputBox,
                        ]}
                        value={String(memberTotal)}
                        onChangeText={(val) => onTotalAmountChange(m.id, val)}
                        keyboardType="number-pad"
                        editable={!isFirst}
                        selectTextOnFocus
                      />
                      <Text style={[styles.unitText, styles.totalUnitText]}>円</Text>
                    </View>
                  </View>
                </View>
              );
            })}

            <View style={[tableStyles.cell, styles.cellAction]}>
              <AppButton
                title={BUTTON_LABELS.splitEqual}
                onPress={onSplitWholeReceiptEqually}
                variant="ghost"
                size="sm"
              />
            </View>
          </View>
        </View>
      </ScrollView>
    </ScrollView>
  );
};

const sem = theme.colors.semantic;

const styles = StyleSheet.create({
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
    ...webTextInputOutlineNone,
  },
  percentBox: { width: 35 },
  amountBox: { width: 60 },
  disabledInputBox: { backgroundColor: sem.neutral.bg, color: theme.colors.text.muted },
  unitText: { fontSize: 11, color: theme.colors.text.muted },
  cellAction: { width: 70, alignItems: 'center' },
});
