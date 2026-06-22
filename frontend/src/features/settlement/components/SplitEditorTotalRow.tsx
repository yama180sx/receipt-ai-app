import React from 'react';
import { View, Text } from 'react-native';
import { AppButton } from '../../../components/ui';
import { BUTTON_LABELS } from '../../../constants/buttonLabels';
import { tableStyles } from '../../../theme';
import type { FamilyMemberSummary } from '../../../types/settlement';
import { SplitEditorMemberSplitInputs } from './SplitEditorMemberSplitInputs';
import { splitEditorItemTableStyles as styles } from '../styles/splitEditorItemTableStyles';

type Props = {
  activeMembers: FamilyMemberSummary[];
  receiptTotalAmount: number;
  getMemberTotalAmount: (memberId: number) => number;
  onTotalAmountChange: (memberId: number, value: string) => void;
  onTotalPercentChange: (memberId: number, value: string) => void;
  onSplitWholeReceiptEqually: () => void;
};

export const SplitEditorTotalRow: React.FC<Props> = ({
  activeMembers,
  receiptTotalAmount,
  getMemberTotalAmount,
  onTotalAmountChange,
  onTotalPercentChange,
  onSplitWholeReceiptEqually,
}) => (
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

      return (
        <View key={m.id} style={[tableStyles.cell, styles.cellInputCol]}>
          <SplitEditorMemberSplitInputs
            percentValue={percentValue}
            amountValue={memberTotal}
            isFirst={idx === 0}
            variant="total"
            onPercentChange={(val) => onTotalPercentChange(m.id, val)}
            onAmountChange={(val) => onTotalAmountChange(m.id, val)}
          />
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
);
