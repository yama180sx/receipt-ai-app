import { Alert, Platform } from 'react-native';

export type ConfirmDialogButton = {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void | Promise<void>;
};

/**
 * 確認ダイアログ。Web では Alert.alert のボタンが効かないため window.confirm を使う。
 */
export function showConfirmDialog(
  title: string,
  message: string,
  buttons: ConfirmDialogButton[]
): void {
  if (Platform.OS === 'web') {
    const cancelButton = buttons.find((b) => b.style === 'cancel');
    const actionButton =
      buttons.find((b) => b.style === 'destructive') ??
      buttons.find((b) => b !== cancelButton && b.style !== 'cancel') ??
      buttons[buttons.length - 1];

    const confirmed = window.confirm(
      message ? `${title}\n\n${message}` : title
    );
    if (confirmed && actionButton?.onPress) {
      void Promise.resolve(actionButton.onPress());
    }
    return;
  }

  Alert.alert(
    title,
    message,
    buttons.map((b) => ({
      text: b.text,
      style: b.style,
      onPress: b.onPress,
    }))
  );
}
