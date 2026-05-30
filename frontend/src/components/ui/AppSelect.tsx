import React, { useMemo, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
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

function valuesEqual<T>(a: T, b: T): boolean {
  if (a === b) return true;
  if (a === null || a === undefined || b === null || b === undefined) return false;
  return String(a) === String(b);
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

  const displayLabel = useMemo(() => {
    if (
      includePlaceholder &&
      (selectedValue === null ||
        selectedValue === undefined ||
        valuesEqual(selectedValue, placeholderValue as T))
    ) {
      return placeholder;
    }
    const found = options.find((o) => valuesEqual(o.value, selectedValue));
    return found?.label ?? placeholder;
  }, [includePlaceholder, selectedValue, placeholderValue, options, placeholder]);

  const listOptions = useMemo(() => {
    const items: AppSelectOption<T>[] = [...options];
    if (includePlaceholder) {
      items.unshift({ label: placeholder, value: placeholderValue as T });
    }
    return items;
  }, [options, includePlaceholder, placeholder, placeholderValue]);

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

  const [open, setOpen] = useState(false);

  return (
    <>
      <TouchableOpacity
        style={[wrapperStyle, modalStyles.selectTrigger]}
        onPress={() => setOpen(true)}
        activeOpacity={0.7}
        accessibilityRole="button"
      >
        <Text style={modalStyles.selectTriggerText} numberOfLines={1}>
          {displayLabel}
        </Text>
        <Text style={modalStyles.selectChevron}>▼</Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={modalStyles.selectOverlay} onPress={() => setOpen(false)}>
          <Pressable style={modalStyles.selectSheet} onPress={(e) => e.stopPropagation()}>
            <ScrollView keyboardShouldPersistTaps="handled">
              {listOptions.map((opt, index) => {
                const selected = valuesEqual(opt.value, selectedValue);
                return (
                  <TouchableOpacity
                    key={`${index}-${String(opt.value)}`}
                    style={[modalStyles.selectOptionRow, selected && modalStyles.selectOptionRowSelected]}
                    onPress={() => {
                      onValueChange(opt.value);
                      setOpen(false);
                    }}
                  >
                    <Text
                      style={[
                        modalStyles.selectOptionText,
                        selected && modalStyles.selectOptionTextSelected,
                      ]}
                      numberOfLines={2}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
