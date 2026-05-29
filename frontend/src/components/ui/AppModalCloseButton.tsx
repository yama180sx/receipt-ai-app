import React from 'react';
import { StyleSheet, Text, TouchableOpacity, ViewStyle, StyleProp } from 'react-native';
import { BUTTON_LABELS } from '../../constants/buttonLabels';
import { theme } from '../../theme';

export interface AppModalCloseButtonProps {
  onPress: () => void;
  /** 読み上げ用（表示は × 固定） */
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * モーダル・オーバーレイを閉じる操作（表示 × / 意味・アクセシビリティは「閉じる」）
 */
export const AppModalCloseButton: React.FC<AppModalCloseButtonProps> = ({
  onPress,
  accessibilityLabel = BUTTON_LABELS.close,
  style,
}) => (
  <TouchableOpacity
    onPress={onPress}
    style={[styles.wrap, style]}
    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    accessibilityRole="button"
    accessibilityLabel={accessibilityLabel}
  >
    <Text style={styles.icon} accessible={false}>
      {BUTTON_LABELS.closeIcon}
    </Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  wrap: {
    minWidth: 32,
    minHeight: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  icon: {
    color: theme.colors.text.muted,
    fontWeight: '600',
    fontSize: 22,
    lineHeight: 24,
  },
});
