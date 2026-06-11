import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  loadDisplayLayoutMode,
  saveDisplayLayoutMode,
  type DisplayLayoutMode,
} from '../services/displayModeService';

type DisplayModeContextValue = {
  mode: DisplayLayoutMode;
  setMode: (mode: DisplayLayoutMode) => Promise<void>;
  isReady: boolean;
};

const DisplayModeContext = createContext<DisplayModeContextValue | null>(null);

export function DisplayModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<DisplayLayoutMode>('auto');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let active = true;
    loadDisplayLayoutMode().then((loaded) => {
      if (active) {
        setModeState(loaded);
        setIsReady(true);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const setMode = useCallback(async (next: DisplayLayoutMode) => {
    setModeState(next);
    await saveDisplayLayoutMode(next);
  }, []);

  const value = useMemo(
    () => ({ mode, setMode, isReady }),
    [mode, setMode, isReady]
  );

  return (
    <DisplayModeContext.Provider value={value}>{children}</DisplayModeContext.Provider>
  );
}

const FALLBACK: DisplayModeContextValue = {
  mode: 'auto',
  setMode: async () => {},
  isReady: true,
};

export function useDisplayMode(): DisplayModeContextValue {
  const ctx = useContext(DisplayModeContext);
  return ctx ?? FALLBACK;
}
