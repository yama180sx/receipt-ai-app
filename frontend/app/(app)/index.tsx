import React from 'react';
import { View, StyleSheet } from 'react-native';

import { MainToolbar } from '../../src/features/app/components/MainToolbar';
import { AppScreenShell } from '../../src/features/app/components/AppScreenShell';
import { useAppNavigation } from '../../src/features/app/hooks/useAppNavigation';
import { scanPath } from '../../src/features/app/navigation/scanRoutes';
import { HomeScreen } from '../../src/screens/HomeScreen';
import type { ReceiptScanInitialData } from '../../src/types/receiptScan';

export default function HomeRoute() {
  const { router, logout, session } = useAppNavigation();
  const {
    currentMemberId,
    currentMemberName,
    currentUserRole,
    biometricEnabled,
    handleDisableBiometric,
  } = session;

  if (!currentMemberId) {
    return null;
  }

  const handleAnalysisReady = (data: ReceiptScanInitialData) => {
    if (data.jobId) {
      router.push(scanPath(data.jobId, 'home'));
    }
  };

  return (
    <AppScreenShell fullWidth={false}>
      <View style={styles.home}>
        <MainToolbar
          memberName={currentMemberName}
          biometricEnabled={biometricEnabled}
          onDisableBiometric={() => void handleDisableBiometric()}
          onLogout={() => void logout()}
        />
        <HomeScreen
          onAnalysisReady={handleAnalysisReady}
          onGoToHistory={() => router.push('/history')}
          onGoToStats={() => router.push('/stats')}
          onGoToReceiptTray={() => router.push('/tray')}
          onGoToSettlement={() => router.push('/settlement')}
          onGoToAdminMenu={() => router.push('/admin')}
          currentMemberId={currentMemberId}
          memberName={currentMemberName}
          userRole={currentUserRole}
        />
      </View>
    </AppScreenShell>
  );
}

const styles = StyleSheet.create({
  home: { flex: 1 },
});
