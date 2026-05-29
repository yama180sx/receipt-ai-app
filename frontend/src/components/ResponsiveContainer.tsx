import React from 'react';
import { StyleSheet, View, Platform } from 'react-native';
import { useResponsive } from '../hooks/useResponsive';
import { theme } from '../theme';

interface Props {
  children: React.ReactNode;
  fullWidth?: boolean; // ★ 追加：制限を解除して100%広げるためのスイッチ
}

/**
 * Web/iPad表示の時にコンテンツの幅を制御するコンテナ
 */
export const ResponsiveContainer: React.FC<Props> = ({ children, fullWidth }) => {
  const { isWideScreen } = useResponsive();

  // Webかつ広い画面で、かつ fullWidth フラグが立っていない時だけ最大幅を適用
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
    backgroundColor: theme.colors.semantic.admin.background,
    alignItems: 'center',
  },
  inner: {
    flex: 1,
    width: '100%',
    backgroundColor: theme.colors.surface,
  },
  mobileContainer: {
    maxWidth: '100%',
  },
  wideContainer: {
    maxWidth: theme.layout.maxContentWidth,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: theme.colors.semantic.admin.border,
  },
});
