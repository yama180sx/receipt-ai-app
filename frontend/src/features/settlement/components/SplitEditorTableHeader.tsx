import React from 'react';
import { View, Text } from 'react-native';
import { tableStyles } from '../../../theme';
import type { FamilyMemberSummary } from '../../../types/settlement';
import { splitEditorItemTableStyles as styles } from '../styles/splitEditorItemTableStyles';

type Props = {
  activeMembers: FamilyMemberSummary[];
};

export const SplitEditorTableHeader: React.FC<Props> = ({ activeMembers }) => (
  <View style={[tableStyles.row, tableStyles.headerRow, styles.tableRowWide]}>
    <Text style={[tableStyles.cell, styles.cellName, tableStyles.headerText]}>商品名</Text>
    <Text style={[tableStyles.cell, styles.cellAmount, tableStyles.headerText]}>合計</Text>
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
    <Text style={[tableStyles.cell, styles.cellAction, tableStyles.headerText]}>操作</Text>
  </View>
);
