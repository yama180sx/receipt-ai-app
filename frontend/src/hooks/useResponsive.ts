import { useWindowDimensions } from 'react-native';
import { BREAKPOINTS } from '../theme';

/**
 * 画面幅に応じたレスポンシブ判定を行うカスタムフック
 */
export const useResponsive = () => {
  const { width } = useWindowDimensions();

  const isWideScreen = width >= BREAKPOINTS.TABLET;

  return {
    width,
    isWideScreen,
    isDesktop: width >= BREAKPOINTS.DESKTOP,
  };
};