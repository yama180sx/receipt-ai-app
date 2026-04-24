import { useWindowDimensions } from 'react-native';

/**
 * 画面幅に応じたレスポンシブ判定を行うカスタムフック
 */
export const useResponsive = () => {
  const { width } = useWindowDimensions();

  // iPad (768px以上) を「広い画面」と定義
  const isWideScreen = width >= 768;

  return {
    width,
    isWideScreen,
    isDesktop: width >= 1024,
  };
};