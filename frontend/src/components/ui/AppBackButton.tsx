import React from 'react';
import { StyleSheet, Text, TouchableOpacity, ViewStyle, StyleProp } from 'react-native';
import { BUTTON_LABELS } from '../../constants/buttonLabels';
import { theme } from '../../theme';

export interface AppBackButtonProps {
  onPress: () => void;
  label?: string;
  style?: StyleProp<ViewStyle>;
}

export const AppBackButton: React.FC<AppBackButtonProps> = ({
  onPress,
  label = BUTTON_LABELS.back,
  style,
}) => (
  <TouchableOpacity
    onPress={onPress}
    style={[styles.wrap, style]}
    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
  >
    <Text style={styles.text}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  wrap: {
    minWidth: 60,
    paddingVertical: 8,
  },
  text: {
    color: theme.colors.primary,
    fontWeight: '700',
    fontSize: 16,
  },
});
