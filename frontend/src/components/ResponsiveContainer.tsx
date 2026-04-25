import React from 'react';
import { StyleSheet, View, Platform } from 'react-native';
import { useResponsive } from '../hooks/useResponsive';

interface Props {
  children: React.ReactNode;
  fullWidth?: boolean; // ★ 追加：制限を解除して100%広げるためのスイッチ
}

/**
 * Web/iPad表示の時にコンテンツの幅を制御するコンテナ
 */
export const ResponsiveContainer: React.FC<Props> = ({ children, fullWidth }) => {
  const { isWideScreen } = useResponsive();

  // Webかつ広い画面で、かつ fullWidth フラグが立っていない時だけ最大幅(600px)を適用
  const isWebWide = Platform.OS === 'web' && isWideScreen;
  const containerStyle = (isWebWide && !fullWidth) ? styles.wideContainer : styles.mobileContainer;

  return (
    <View style={styles.outer}>
      <View style={[styles.inner, containerStyle]}>
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    backgroundColor: '#f8f9fa', // 画面両端の余白部分の色
    alignItems: 'center',       // 横方向の中央寄せ
  },
  inner: {
    flex: 1,
    width: '100%',
    backgroundColor: '#ffffff', // アプリ本体の背景色
  },
  mobileContainer: {
    maxWidth: '100%',
  },
  wideContainer: {
    maxWidth: 600,             // iPad/PCで見た時の通常のアプリ横幅
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#e9ecef',
  },
});