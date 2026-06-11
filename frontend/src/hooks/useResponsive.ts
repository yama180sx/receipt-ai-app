import { useWindowDimensions } from 'react-native';
import { BREAKPOINTS } from '../theme';
import { useIsWideLayout } from './useIsWideLayout';

/**
 * 画面幅に応じたレスポンシブ判定を行うカスタムフック
 */
export const useResponsive = () => {
  const { width } = useWindowDimensions();
  const isWideScreen = useIsWideLayout();

  return {
    width,
    isWideScreen,
    isDesktop: width >= BREAKPOINTS.DESKTOP,
  };
};