import { Platform } from 'react-native';
import { BREAKPOINTS } from '../theme/breakpoints';
import type { DisplayLayoutMode } from '../services/displayModeService';

/**
 * 表示モードと画面幅からワイドレイアウト（2カラム等）を使うか判定する。
 * Native は常に幅ベース。Web のみユーザー選択を反映。
 */
export function resolveIsWideLayout(
  width: number,
  mode: DisplayLayoutMode,
  breakpoint: number = BREAKPOINTS.TABLET
): boolean {
  if (Platform.OS !== 'web') {
    return width >= breakpoint;
  }
  if (mode === 'mobile') {
    return false;
  }
  return width >= breakpoint;
}
