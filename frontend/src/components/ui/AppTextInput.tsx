import React, { useState } from 'react';
import {
  StyleProp,
  TextInput,
  TextInputProps,
  TextStyle,
  ViewStyle,
} from 'react-native';
import { formStyles } from '../../theme/formStyles';
import { colors } from '../../theme/colors';

export type AppTextInputVariant = 'default' | 'textarea' | 'textareaFill' | 'inline';

export interface AppTextInputProps
  extends Pick<
    TextInputProps,
    | 'value'
    | 'onChangeText'
    | 'placeholder'
    | 'keyboardType'
    | 'multiline'
    | 'numberOfLines'
    | 'textAlignVertical'
    | 'autoCapitalize'
    | 'autoCorrect'
    | 'editable'
    | 'selectTextOnFocus'
    | 'secureTextEntry'
    | 'placeholderTextColor'
    | 'onFocus'
    | 'onBlur'
  > {
  /** true またはメッセージ文字列でエラー枠を表示（メッセージは AppFormField 側を推奨） */
  error?: boolean | string;
  variant?: AppTextInputVariant;
  style?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
}

export const AppTextInput: React.FC<AppTextInputProps> = ({
  error,
  variant = 'default',
  style,
  inputStyle,
  placeholderTextColor = colors.text.muted,
  multiline,
  numberOfLines,
  textAlignVertical,
  onFocus,
  onBlur,
  ...rest
}) => {
  const [focused, setFocused] = useState(false);
  const hasError = Boolean(error);

  const isInline = variant === 'inline';
  const isTextarea = variant === 'textarea' || variant === 'textareaFill';
  const resolvedMultiline = multiline ?? isTextarea;
  const resolvedNumberOfLines = numberOfLines ?? (isTextarea ? 4 : undefined);
  const resolvedTextAlignVertical =
    textAlignVertical ?? (isTextarea ? 'top' : undefined);

  return (
    <TextInput
      {...rest}
      multiline={resolvedMultiline}
      numberOfLines={resolvedNumberOfLines}
      textAlignVertical={resolvedTextAlignVertical}
      placeholderTextColor={placeholderTextColor}
      onFocus={(e) => {
        setFocused(true);
        onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        onBlur?.(e);
      }}
      style={[
        isInline ? formStyles.inputInline : formStyles.input,
        variant === 'textarea' && formStyles.textArea,
        variant === 'textareaFill' && formStyles.textAreaFill,
        !isInline && focused && !hasError && formStyles.inputFocused,
        !isInline && hasError && formStyles.inputError,
        style,
        inputStyle,
      ]}
    />
  );
};
