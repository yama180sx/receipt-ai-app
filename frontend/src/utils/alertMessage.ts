import { Alert, Platform } from 'react-native';

/**
 * 通知ダイアログ。Web では Alert.alert が表示されないことがあるため window.alert を使う。
 */
export function showAlert(
  title: string,
  message?: string,
  options?: { onOk?: () => void }
): void {
  const body = message ? `${title}\n\n${message}` : title;

  if (Platform.OS === 'web') {
    window.alert(body);
    options?.onOk?.();
    return;
  }

  if (options?.onOk) {
    Alert.alert(title, message, [{ text: 'OK', onPress: options.onOk }]);
  } else {
    Alert.alert(title, message);
  }
}
