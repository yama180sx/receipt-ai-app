import React, { useCallback } from 'react';
import { Redirect, Stack, usePathname, useRouter } from 'expo-router';

import { ReceiptTrayProvider } from '../../src/contexts/ReceiptTrayContext';
import { useAppSessionContext } from '../../src/features/app/contexts/AppSessionContext';
import { scanPath } from '../../src/features/app/navigation/scanRoutes';
import type { ReceiptScanInitialData } from '../../src/types/receiptScan';

export default function AppGroupLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const { userToken, currentMemberId } = useAppSessionContext();

  const handleOpenScan = useCallback(
    (data: ReceiptScanInitialData) => {
      const jobId = data.jobId;
      if (!jobId) {
        return;
      }
      const returnTo = pathname.startsWith('/tray') ? 'tray' : 'home';
      router.push(scanPath(jobId, returnTo));
    },
    [pathname, router]
  );

  if (!userToken) {
    return <Redirect href="/login" />;
  }

  return (
    <ReceiptTrayProvider
      enabled={Boolean(currentMemberId)}
      onOpenScan={handleOpenScan}
    >
      <Stack screenOptions={{ headerShown: false }} />
    </ReceiptTrayProvider>
  );
}
