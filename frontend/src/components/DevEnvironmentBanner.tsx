import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { devUiColors, isDevAppEnv } from '../config/appEnv';

export function DevEnvironmentBanner() {
  if (!isDevAppEnv()) return null;

  return (
    <View style={styles.banner} accessibilityRole="text">
      <Text style={styles.text}>DEV — 開発環境（stable 本番ではありません）</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: devUiColors.bannerBg,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  text: {
    color: devUiColors.bannerText,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
