import { useWindowDimensions } from 'react-native';
import { BREAKPOINTS } from '../theme';
import { useDisplayMode } from '../contexts/DisplayModeContext';
import { resolveIsWideLayout } from '../utils/displayLayout';

type Options = {
  /** マスタペイン等を差し引いた有効幅 */
  width?: number;
  breakpoint?: number;
};

/**
 * 画面幅と表示モード（Web のみ）からワイドレイアウト判定。
 */
export function useIsWideLayout(options?: Options): boolean {
  const { width: windowWidth } = useWindowDimensions();
  const { mode } = useDisplayMode();
  const width = options?.width ?? windowWidth;
  const breakpoint = options?.breakpoint ?? BREAKPOINTS.TABLET;
  return resolveIsWideLayout(width, mode, breakpoint);
}

/** HomeScreen 精算メニュー表示用（従来 600px 閾値） */
export function useIsWideHomeMenu(): boolean {
  return useIsWideLayout({ breakpoint: 600 });
}
