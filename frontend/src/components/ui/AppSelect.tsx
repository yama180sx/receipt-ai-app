import React from 'react';
import { Platform, StyleProp, View, ViewStyle } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { modalStyles } from '../../theme/modalStyles';
import { colors } from '../../theme/colors';

export interface AppSelectOption<T extends string | number | null = string | number | null> {
  label: string;
  value: T;
}

export interface AppSelectProps<T extends string | number | null = string | number | null> {
  selectedValue: T;
  onValueChange: (value: T) => void;
  options: AppSelectOption<T>[];
  placeholder?: string;
  placeholderValue?: T;
  error?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function AppSelect<T extends string | number | null = string | number | null>({
  selectedValue,
  onValueChange,
  options,
  placeholder = '選択してください',
  placeholderValue = null as T,
  error,
  style,
}: AppSelectProps<T>) {
  return (
    <View
      style={[
        modalStyles.selectWrapper,
        error && modalStyles.selectWrapperError,
        style,
      ]}
    >
      <Picker
        selectedValue={selectedValue}
        onValueChange={(value) => onValueChange(value as T)}
        style={modalStyles.selectPicker}
        {...Platform.select({ ios: { mode: 'dropdown' as const }, default: {} })}
      >
        <Picker.Item
          label={placeholder}
          value={placeholderValue as unknown as number}
          color={colors.text.muted}
        />
        {options.map((opt) => (
          <Picker.Item
            key={String(opt.value)}
            label={opt.label}
            value={opt.value as unknown as number}
          />
        ))}
      </Picker>
    </View>
  );
}
