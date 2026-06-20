import React from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';

import { DevEnvironmentBanner } from '../../src/components/DevEnvironmentBanner';
import { ResponsiveContainer } from '../../src/components/ResponsiveContainer';
import { useAppSessionContext } from '../../src/features/app/contexts/AppSessionContext';
import HistoryScreen from '../../src/screens/HistoryScreen';

export default function HistoryRoute() {
  const router = useRouter();
  const { currentMemberId } = useAppSessionContext();

  if (!currentMemberId) {
    return null;
  }

  return (
    <ResponsiveContainer fullWidth>
      <DevEnvironmentBanner />
      <HistoryScreen
        currentMemberId={currentMemberId}
        onBack={() => {
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace('/');
          }
        }}
        onGoToSplitEditor={() => {
          Alert.alert('PoC スコープ外', '按分編集は Issue #404（本番移行）で移行予定です。');
        }}
      />
    </ResponsiveContainer>
  );
}
