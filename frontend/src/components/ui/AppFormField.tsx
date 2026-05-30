import React from 'react';
import { StyleProp, Text, View, ViewStyle } from 'react-native';
import { formStyles } from '../../theme/formStyles';

export interface AppFormFieldProps {
  label?: string;
  /** 表示すると入力にエラー枠を連動（子が AppTextInput のとき error prop も渡す） */
  error?: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export const AppFormField: React.FC<AppFormFieldProps> = ({
  label,
  error,
  children,
  style,
}) => (
  <View style={[formStyles.field, style]}>
    {label ? <Text style={formStyles.label}>{label}</Text> : null}
    {children}
    {error ? <Text style={formStyles.errorText}>{error}</Text> : null}
  </View>
);
