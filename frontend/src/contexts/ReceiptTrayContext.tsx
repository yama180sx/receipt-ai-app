import React, { createContext, useContext } from 'react';
import type { ReceiptScanInitialData } from '../types/receiptScan';
import {
  useReceiptTrayController,
  type ReceiptTrayContextValue,
} from '../hooks/useReceiptTrayController';

const ReceiptTrayContext = createContext<ReceiptTrayContextValue | null>(null);

type ReceiptTrayProviderProps = {
  children: React.ReactNode;
  enabled: boolean;
  onOpenScan: (data: ReceiptScanInitialData) => void;
  onRegisterRefresh?: (refresh: () => Promise<void>) => void;
};

export function ReceiptTrayProvider({
  children,
  enabled,
  onOpenScan,
  onRegisterRefresh,
}: ReceiptTrayProviderProps) {
  const value = useReceiptTrayController({ enabled, onOpenScan, onRegisterRefresh });

  return <ReceiptTrayContext.Provider value={value}>{children}</ReceiptTrayContext.Provider>;
}

export function useReceiptTray(): ReceiptTrayContextValue {
  const context = useContext(ReceiptTrayContext);
  if (!context) {
    throw new Error('useReceiptTray must be used within ReceiptTrayProvider');
  }
  return context;
}

/** ローカル失敗行の追加のみ（Provider 外では使わない） */
export function useReceiptTrayLocalFailures(): Pick<
  ReceiptTrayContextValue,
  'localFailedJobs' | 'addLocalFailedJob'
> {
  const { localFailedJobs, addLocalFailedJob } = useReceiptTray();
  return { localFailedJobs, addLocalFailedJob };
}
