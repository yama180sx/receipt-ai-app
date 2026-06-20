import { Platform, type TextStyle } from 'react-native';

/** RN Web: outlineStyle は StyleSheet 型に未収載 */
export const webTextInputOutlineNone: TextStyle =
  Platform.OS === 'web' ? ({ outlineStyle: 'none' } as TextStyle) : {};

/** RN Web: Picker のブラウザデフォルト枠線を除去 */
export const webPickerOutlineReset: TextStyle =
  Platform.OS === 'web'
    ? ({
        outlineStyle: 'none',
        borderWidth: 0,
        backgroundColor: 'transparent',
      } as TextStyle)
    : {};
