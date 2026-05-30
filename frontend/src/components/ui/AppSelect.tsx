import React from 'react';
import { Platform, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
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
  /** false のとき先頭の未選択肢を出さない（月選択など） */
  includePlaceholder?: boolean;
  error?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function AppSelect<T extends string | number | null = string | number | null>({
  selectedValue,
  onValueChange,
  options,
  placeholder = '選択してください',
  placeholderValue = null as T,
  includePlaceholder = true,
  error,
  style,
}: AppSelectProps<T>) {
  const wrapperStyle = [
    modalStyles.selectWrapper,
    error && modalStyles.selectWrapperError,
    style,
  ];

  if (Platform.OS === 'web') {
    const webValue =
      selectedValue === null || selectedValue === undefined
        ? ''
        : String(selectedValue);

    return (
      <View style={wrapperStyle}>
        <select
          value={webValue}
          onChange={(e) => {
            const raw = e.target.value;
            if (includePlaceholder && raw === String(placeholderValue ?? '')) {
              onValueChange(placeholderValue as T);
              return;
            }
            const matched = options.find((o) => String(o.value) === raw);
            onValueChange((matched?.value ?? raw) as T);
          }}
          style={StyleSheet.flatten(modalStyles.webSelect) as React.CSSProperties}
        >
          {includePlaceholder ? (
            <option value={String(placeholderValue ?? '')}>{placeholder}</option>
          ) : null}
          {options.map((opt) => (
            <option key={String(opt.value)} value={String(opt.value)}>
              {opt.label}
            </option>
          ))}
        </select>
      </View>
    );
  }

  return (
    <View style={wrapperStyle}>
      <Picker
        selectedValue={selectedValue}
        onValueChange={(value) => onValueChange(value as T)}
        style={modalStyles.selectPicker}
        {...Platform.select({ ios: { mode: 'dropdown' as const }, default: {} })}
      >
        {includePlaceholder ? (
          <Picker.Item
            label={placeholder}
            value={placeholderValue as unknown as number}
            color={colors.text.muted}
          />
        ) : null}
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
