import React from 'react';
import { StyleSheet, View, Platform } from 'react-native';
import { useResponsive } from '../hooks/useResponsive';

interface Props {
  children: React.ReactNode;
}

/**
 * Web/iPad表示の時にコンテンツが横に広がりすぎないように制限するコンテナ
 */
export const ResponsiveContainer: React.FC<Props> = ({ children }) => {
  const { isWideScreen } = useResponsive();

  // Webかつ広い画面の時だけ、最大幅(600px)を適用して中央寄せ
  const isWebWide = Platform.OS === 'web' && isWideScreen;
  const containerStyle = isWebWide ? styles.wideContainer : styles.mobileContainer;

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
    maxWidth: 600,             // iPad/PCで見た時のアプリの横幅
    // 左右に薄い境界線を入れると、Webサイトっぽさが増します
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#e9ecef',
  },
});