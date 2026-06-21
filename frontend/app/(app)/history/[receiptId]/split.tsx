import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { AppScreenShell } from '../../../../src/features/app/components/AppScreenShell';
import { useAppNavigation } from '../../../../src/features/app/hooks/useAppNavigation';
import {
  clearPendingSplitReceipt,
  consumePendingSplitReceipt,
} from '../../../../src/features/app/navigation/splitEditorNavigation';
import { loadReceiptForSplitEditor } from '../../../../src/features/app/utils/receiptForSplitEditor';
import { SplitEditorScreen } from '../../../../src/screens/SplitEditorScreen';
import { theme } from '../../../../src/theme';
import type { ReceiptForSplitEditor } from '../../../../src/types/settlement';

export default function SplitEditorRoute() {
  const router = useRouter();
  const { goBackOrHome } = useAppNavigation();
  const { receiptId: receiptIdParam } = useLocalSearchParams<{ receiptId: string }>();
  const receiptId = Number(receiptIdParam);
  const [receipt, setReceipt] = useState<ReceiptForSplitEditor | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!Number.isFinite(receiptId)) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    void (async () => {
      setLoading(true);
      const pending = consumePendingSplitReceipt(receiptId);
      const loaded = pending ?? (await loadReceiptForSplitEditor(receiptId));
      if (!cancelled) {
        setReceipt(loaded);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [receiptId]);

  useEffect(() => {
    return () => {
      clearPendingSplitReceipt();
    };
  }, []);

  if (!Number.isFinite(receiptId)) {
    router.replace('/history');
    return null;
  }

  if (loading) {
    return (
      <AppScreenShell fullWidth>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </AppScreenShell>
    );
  }

  if (!receipt) {
    router.replace('/history');
    return null;
  }

  return (
    <AppScreenShell fullWidth>
      <SplitEditorScreen
        receipt={receipt}
        onBack={() => {
          clearPendingSplitReceipt();
          goBackOrHome();
        }}
      />
    </AppScreenShell>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
