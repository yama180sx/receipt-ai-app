import React from 'react';
import { View, ScrollView } from 'react-native';
import { tableStyles } from '../../../theme';
import { calcItemTotal } from '../../../utils/splitEditorSplits';
import type {
  FamilyMemberSummary,
  ReceiptForSplitEditor,
} from '../../../types/settlement';
import { SplitEditorTableHeader } from './SplitEditorTableHeader';
import { SplitEditorItemRow } from './SplitEditorItemRow';
import { SplitEditorTotalRow } from './SplitEditorTotalRow';
import { splitEditorItemTableStyles as styles } from '../styles/splitEditorItemTableStyles';

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
}) => (
  <ScrollView style={styles.tableScroll} horizontal={false}>
    <ScrollView horizontal contentContainerStyle={{ flexDirection: 'column' }}>
      <View style={tableStyles.wrapper}>
        <SplitEditorTableHeader activeMembers={activeMembers} />

        {receipt.items.map((item) => (
          <SplitEditorItemRow
            key={item.id}
            item={item}
            itemTotal={calcItemTotal(item)}
            activeMembers={activeMembers}
            editSplits={editSplits}
            onAmountChange={onAmountChange}
            onPercentChange={onPercentChange}
            onSplitItemEqually={onSplitItemEqually}
          />
        ))}

        <SplitEditorTotalRow
          activeMembers={activeMembers}
          receiptTotalAmount={receiptTotalAmount}
          getMemberTotalAmount={getMemberTotalAmount}
          onTotalAmountChange={onTotalAmountChange}
          onTotalPercentChange={onTotalPercentChange}
          onSplitWholeReceiptEqually={onSplitWholeReceiptEqually}
        />
      </View>
    </ScrollView>
  </ScrollView>
);
