import React from 'react';
import { View, Text } from 'react-native';
import { AppButton } from '../../../components/ui';
import { BUTTON_LABELS } from '../../../constants/buttonLabels';
import { tableStyles } from '../../../theme';
import type { FamilyMemberSummary, ReceiptItemForSplit } from '../../../types/settlement';
import { SplitEditorMemberSplitInputs } from './SplitEditorMemberSplitInputs';
import { splitEditorItemTableStyles as styles } from '../styles/splitEditorItemTableStyles';

type Props = {
  item: ReceiptItemForSplit;
  itemTotal: number;
  activeMembers: FamilyMemberSummary[];
  editSplits: Record<number, Record<number, number>>;
  onAmountChange: (itemId: number, memberId: number, value: string, itemTotal: number) => void;
  onPercentChange: (itemId: number, memberId: number, value: string, itemTotal: number) => void;
  onSplitItemEqually: (itemId: number, itemTotal: number) => void;
};

export const SplitEditorItemRow: React.FC<Props> = ({
  item,
  itemTotal,
  activeMembers,
  editSplits,
  onAmountChange,
  onPercentChange,
  onSplitItemEqually,
}) => (
  <View style={[tableStyles.row, styles.tableRowWide]}>
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

      return (
        <View key={m.id} style={[tableStyles.cell, styles.cellInputCol]}>
          <SplitEditorMemberSplitInputs
            percentValue={percentValue}
            amountValue={amountValue}
            isFirst={idx === 0}
            onPercentChange={(val) => onPercentChange(item.id, m.id, val, itemTotal)}
            onAmountChange={(val) => onAmountChange(item.id, m.id, val, itemTotal)}
          />
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
