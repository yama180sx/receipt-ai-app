import React, { createContext, useContext } from 'react';
import { useAppSession } from '../hooks/useAppSession';

type AppSessionContextValue = ReturnType<typeof useAppSession>;

const AppSessionContext = createContext<AppSessionContextValue | null>(null);

export function AppSessionProvider({ children }: { children: React.ReactNode }) {
  const session = useAppSession();
  return <AppSessionContext.Provider value={session}>{children}</AppSessionContext.Provider>;
}

export function useAppSessionContext(): AppSessionContextValue {
  const ctx = useContext(AppSessionContext);
  if (!ctx) {
    throw new Error('useAppSessionContext must be used within AppSessionProvider');
  }
  return ctx;
}
