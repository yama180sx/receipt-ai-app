import React from 'react';
import { Alert } from 'react-native';
import { Redirect, Stack } from 'expo-router';

import { ReceiptTrayProvider } from '../../src/contexts/ReceiptTrayContext';
import { useAppSessionContext } from '../../src/features/app/contexts/AppSessionContext';
import type { ReceiptScanInitialData } from '../../src/types/receiptScan';

function showPocScopeAlert() {
  Alert.alert('PoC スコープ外', 'この画面は Issue #404（本番移行）で Expo Router に移行予定です。');
}

export default function AppGroupLayout() {
  const { userToken, currentMemberId } = useAppSessionContext();

  if (!userToken) {
    return <Redirect href="/login" />;
  }

  return (
    <ReceiptTrayProvider
      enabled={Boolean(currentMemberId)}
      onOpenScan={(_data: ReceiptScanInitialData) => {
        showPocScopeAlert();
      }}
      onRegisterRefresh={() => {}}
    >
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="history" />
      </Stack>
    </ReceiptTrayProvider>
  );
}
