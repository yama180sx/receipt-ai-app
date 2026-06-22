import React from 'react';
import { View, Text, TextInput } from 'react-native';
import { webTextInputOutlineNone } from '../../../utils/webPlatformStyles';
import { splitEditorItemTableStyles as styles } from '../styles/splitEditorItemTableStyles';

type Props = {
  percentValue: number;
  amountValue: number;
  isFirst: boolean;
  variant?: 'default' | 'total';
  onPercentChange: (value: string) => void;
  onAmountChange: (value: string) => void;
};

export const SplitEditorMemberSplitInputs: React.FC<Props> = ({
  percentValue,
  amountValue,
  isFirst,
  variant = 'default',
  onPercentChange,
  onAmountChange,
}) => {
  const isTotal = variant === 'total';
  const inputGroupStyle = isTotal
    ? [styles.inputGroup, styles.totalInputGroup]
    : styles.inputGroup;
  const inputBoxBase = [
    styles.inputBox,
    isFirst && styles.disabledInputBox,
    isTotal && styles.totalInputBox,
    webTextInputOutlineNone,
  ];
  const unitStyle = isTotal ? [styles.unitText, styles.totalUnitText] : styles.unitText;

  return (
    <View style={styles.dualInputWrapper}>
      <View style={inputGroupStyle}>
        <TextInput
          style={[...inputBoxBase, styles.percentBox]}
          value={String(percentValue)}
          onChangeText={onPercentChange}
          keyboardType="number-pad"
          editable={!isFirst}
          selectTextOnFocus
        />
        <Text style={unitStyle}>%</Text>
      </View>

      <View style={[inputGroupStyle, { marginLeft: 4 }]}>
        <TextInput
          style={[...inputBoxBase, styles.amountBox]}
          value={String(amountValue)}
          onChangeText={onAmountChange}
          keyboardType="number-pad"
          editable={!isFirst}
          selectTextOnFocus
        />
        <Text style={unitStyle}>円</Text>
      </View>
    </View>
  );
};
