import React, { useCallback } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { DevEnvironmentBanner } from '../../src/components/DevEnvironmentBanner';
import { ResponsiveContainer } from '../../src/components/ResponsiveContainer';
import { MainToolbar } from '../../src/features/app/components/MainToolbar';
import { useAppSessionContext } from '../../src/features/app/contexts/AppSessionContext';
import { HomeScreen } from '../../src/screens/HomeScreen';
import { theme } from '../../src/theme';

function showPocScopeAlert() {
  Alert.alert('PoC スコープ外', 'この画面は Issue #404（本番移行）で Expo Router に移行予定です。');
}

export default function HomeRoute() {
  const router = useRouter();
  const {
    currentMemberId,
    currentMemberName,
    currentUserRole,
    biometricEnabled,
    handleDisableBiometric,
    handleLogout,
  } = useAppSessionContext();

  const onLogout = useCallback(async () => {
    await handleLogout();
    router.replace('/login');
  }, [handleLogout, router]);

  if (!currentMemberId) {
    return null;
  }

  return (
    <ResponsiveContainer fullWidth={false}>
      <View style={styles.container}>
        <DevEnvironmentBanner />
        <MainToolbar
          memberName={currentMemberName}
          biometricEnabled={biometricEnabled}
          onDisableBiometric={() => void handleDisableBiometric()}
          onLogout={() => void onLogout()}
        />
        <HomeScreen
          onAnalysisReady={() => showPocScopeAlert()}
          onGoToHistory={() => router.push('/history')}
          onGoToStats={() => showPocScopeAlert()}
          onGoToReceiptTray={() => showPocScopeAlert()}
          onGoToSettlement={() => showPocScopeAlert()}
          onGoToAdminMenu={() => showPocScopeAlert()}
          currentMemberId={currentMemberId}
          memberName={currentMemberName}
          userRole={currentUserRole}
        />
      </View>
    </ResponsiveContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
});
