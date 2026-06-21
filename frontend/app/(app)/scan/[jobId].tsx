import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { AppScreenShell } from '../../../src/features/app/components/AppScreenShell';
import {
  parseScanReturnTo,
  returnPathForScan,
} from '../../../src/features/app/navigation/scanRoutes';
import { useAppSessionContext } from '../../../src/features/app/contexts/AppSessionContext';
import { useReceiptTray } from '../../../src/contexts/ReceiptTrayContext';
import { ReceiptScanScreen } from '../../../src/screens/ReceiptScanScreen';
import { theme } from '../../../src/theme';
import { fetchReceiptScanInitialData } from '../../../src/utils/receiptJobActions';
import type { ReceiptScanInitialData } from '../../../src/types/receiptScan';

export default function ScanRoute() {
  const router = useRouter();
  const { jobId, returnTo: returnToParam } = useLocalSearchParams<{
    jobId: string;
    returnTo?: string;
  }>();
  const { categories } = useAppSessionContext();
  const { refresh } = useReceiptTray();
  const [initialData, setInitialData] = useState<ReceiptScanInitialData | null>(null);
  const [loading, setLoading] = useState(true);

  const returnTo = parseScanReturnTo(returnToParam);
  const returnPath = returnPathForScan(returnTo);

  useEffect(() => {
    if (!jobId) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    void (async () => {
      setLoading(true);
      const data = await fetchReceiptScanInitialData(jobId);
      if (!cancelled) {
        setInitialData(data);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [jobId]);

  if (!jobId) {
    router.replace(returnPath);
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

  if (!initialData) {
    router.replace(returnPath);
    return null;
  }

  return (
    <AppScreenShell fullWidth>
      <ReceiptScanScreen
        initialData={initialData}
        categories={categories}
        onSuccess={() => {
          void refresh({ userInitiated: true });
          router.replace(returnPath);
        }}
        onCancel={() => {
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace(returnPath);
          }
        }}
      />
    </AppScreenShell>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
