import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Slot } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';

import { theme } from '../src/theme';
import { ResponsiveContainer } from '../src/components/ResponsiveContainer';
import { DisplayModeProvider } from '../src/contexts/DisplayModeContext';
import { AppSessionProvider, useAppSessionContext } from '../src/features/app/contexts/AppSessionContext';
import { BiometricLockScreen } from '../src/screens/BiometricLockScreen';

SplashScreen.preventAutoHideAsync().catch(() => {});

function RootGate({ children }: { children: React.ReactNode }) {
  const {
    isReady,
    biometricLockActive,
    pendingSession,
    handleBiometricUnlock,
    handleUsePasswordFromLock,
  } = useAppSessionContext();

  if (!isReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (biometricLockActive && pendingSession) {
    return (
      <ResponsiveContainer fullWidth={false}>
        <BiometricLockScreen
          memberName={pendingSession.memberName}
          onUnlocked={() => void handleBiometricUnlock()}
          onUsePassword={() => void handleUsePasswordFromLock()}
        />
      </ResponsiveContainer>
    );
  }

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <DisplayModeProvider>
        <AppSessionProvider>
          <RootGate>
            <Slot />
          </RootGate>
        </AppSessionProvider>
      </DisplayModeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
});
