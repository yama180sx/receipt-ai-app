import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  ViewStyle,
  StyleProp,
  TextStyle,
} from 'react-native';
import { theme } from '../../theme';

export type AppButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'danger'
  | 'dangerFilled'
  | 'ghost'
  | 'success';

export type AppButtonSize = 'sm' | 'md' | 'lg';

export interface AppButtonProps {
  title: string;
  onPress: () => void;
  variant?: AppButtonVariant;
  size?: AppButtonSize;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

const SIZE_STYLES: Record<AppButtonSize, ViewStyle> = {
  sm: { paddingHorizontal: 12, paddingVertical: 6, minHeight: 32 },
  md: { paddingHorizontal: 16, paddingVertical: 10, minHeight: 40 },
  lg: { paddingHorizontal: 20, paddingVertical: 14, minHeight: 48 },
};

const FONT_SIZES: Record<AppButtonSize, number> = {
  sm: 12,
  md: 16,
  lg: 16,
};

function getVariantStyle(variant: AppButtonVariant): { container: ViewStyle; text: TextStyle } {
  const c = theme.colors;
  const adm = c.semantic.admin;

  switch (variant) {
    case 'primary':
      return {
        container: { backgroundColor: c.primary, borderWidth: 0 },
        text: { color: c.text.inverse },
      };
    case 'success':
      return {
        container: { backgroundColor: adm.success, borderWidth: 0 },
        text: { color: c.text.inverse },
      };
    case 'secondary':
      return {
        container: { backgroundColor: c.semantic.neutral.bg, borderWidth: 1, borderColor: c.border },
        text: { color: c.text.muted },
      };
    case 'outline':
      return {
        container: { backgroundColor: 'transparent', borderWidth: 1, borderColor: c.primary },
        text: { color: c.primary },
      };
    case 'danger':
      return {
        container: { backgroundColor: 'transparent', borderWidth: 1, borderColor: adm.danger },
        text: { color: adm.danger },
      };
    case 'dangerFilled':
      return {
        container: { backgroundColor: c.error, borderWidth: 0 },
        text: { color: c.text.inverse },
      };
    case 'ghost':
      return {
        container: { backgroundColor: c.semantic.neutral.bg, borderWidth: 0 },
        text: { color: c.text.muted, fontWeight: 'bold' },
      };
    default:
      return {
        container: { backgroundColor: c.primary, borderWidth: 0 },
        text: { color: c.text.inverse },
      };
  }
}

export const AppButton: React.FC<AppButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  style,
  textStyle,
}) => {
  const isDisabled = disabled || loading;
  const variantStyle = useMemo(() => getVariantStyle(variant), [variant]);

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.7}
      style={[
        styles.base,
        SIZE_STYLES[size],
        variantStyle.container,
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variantStyle.text.color as string}
        />
      ) : (
        <Text
          style={[
            styles.text,
            { fontSize: FONT_SIZES[size] },
            variantStyle.text,
            textStyle,
          ]}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: theme.borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  fullWidth: {
    alignSelf: 'stretch',
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    ...theme.typography.button,
    textAlign: 'center',
  },
});
