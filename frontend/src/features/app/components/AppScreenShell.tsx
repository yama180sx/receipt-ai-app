import React from 'react';
import { View, StyleSheet } from 'react-native';

import { DevEnvironmentBanner } from '../../../components/DevEnvironmentBanner';
import { ResponsiveContainer } from '../../../components/ResponsiveContainer';
import { theme } from '../../../theme';

type AppScreenShellProps = {
  children: React.ReactNode;
  fullWidth?: boolean;
  showDevBanner?: boolean;
};

export function AppScreenShell({
  children,
  fullWidth = true,
  showDevBanner = true,
}: AppScreenShellProps) {
  return (
    <ResponsiveContainer fullWidth={fullWidth}>
      <View style={styles.container}>
        {showDevBanner ? <DevEnvironmentBanner /> : null}
        {children}
      </View>
    </ResponsiveContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
});
