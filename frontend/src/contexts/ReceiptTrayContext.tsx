import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { LocalFailedReceiptJob } from '../types/receiptJob';

type ReceiptTrayContextValue = {
  localFailedJobs: LocalFailedReceiptJob[];
  addLocalFailedJob: (reason: string) => void;
};

const ReceiptTrayContext = createContext<ReceiptTrayContextValue | null>(null);

export function ReceiptTrayProvider({ children }: { children: React.ReactNode }) {
  const [localFailedJobs, setLocalFailedJobs] = useState<LocalFailedReceiptJob[]>([]);

  const addLocalFailedJob = useCallback((reason: string) => {
    setLocalFailedJobs((prev) => [
      {
        id: `local-failed-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        state: 'failed',
        createdAt: Date.now(),
        failedReason: reason,
        localOnly: true,
      },
      ...prev,
    ]);
  }, []);

  const value = useMemo(
    () => ({ localFailedJobs, addLocalFailedJob }),
    [localFailedJobs, addLocalFailedJob]
  );

  return <ReceiptTrayContext.Provider value={value}>{children}</ReceiptTrayContext.Provider>;
}

export function useReceiptTrayLocalFailures(): ReceiptTrayContextValue {
  const context = useContext(ReceiptTrayContext);
  if (!context) {
    throw new Error('useReceiptTrayLocalFailures must be used within ReceiptTrayProvider');
  }
  return context;
}
