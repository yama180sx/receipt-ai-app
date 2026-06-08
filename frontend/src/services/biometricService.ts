import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';

/** Web は Later。Native のみ生体ロック対象 */
export function isBiometricPlatform(): boolean {
  return Platform.OS === 'ios' || Platform.OS === 'android';
}

export async function canUseBiometric(): Promise<boolean> {
  if (!isBiometricPlatform()) return false;

  const [hasHardware, isEnrolled] = await Promise.all([
    LocalAuthentication.hasHardwareAsync(),
    LocalAuthentication.isEnrolledAsync(),
  ]);
  return hasHardware && isEnrolled;
}

export async function authenticateWithBiometric(
  promptMessage = 'アプリのロックを解除してください'
): Promise<boolean> {
  if (!isBiometricPlatform()) return false;

  const result = await LocalAuthentication.authenticateAsync({
    promptMessage,
    cancelLabel: 'キャンセル',
    disableDeviceFallback: false,
  });
  return result.success;
}
