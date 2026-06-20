import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  StyleSheet,
  View,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SplashScreen from 'expo-splash-screen';

import { theme } from './src/theme';
import { ResponsiveContainer } from './src/components/ResponsiveContainer';
import { DisplayModeProvider } from './src/contexts/DisplayModeContext';
import { DevEnvironmentBanner } from './src/components/DevEnvironmentBanner';
import { ReceiptTrayProvider } from './src/contexts/ReceiptTrayContext';
import { LoginScreen } from './src/screens/LoginScreen';
import { BiometricLockScreen } from './src/screens/BiometricLockScreen';
import { AppViewRouter } from './src/components/AppViewRouter';
import { useAppSession, type AppViewType } from './src/hooks/useAppSession';
import type { ReceiptScanInitialData } from './src/types/receiptScan';
import type { ReceiptForSplitEditor } from './src/types/settlement';

SplashScreen.preventAutoHideAsync().catch(() => {});

const FULL_WIDTH_VIEWS: AppViewType[] = [
  'history',
  'stats',
  'category_mgr',
  'product_master',
  'receipt_scan',
  'receipt_tray',
  'prompt_editor',
  'admin_stats',
  'admin_menu',
  'split_editor',
  'settlement_summary',
  'totp_settings',
];

export default function App() {
  const session = useAppSession();
  const {
    isReady,
    userToken,
    currentMemberId,
    currentMemberName,
    currentUserRole,
    pendingSession,
    biometricLockActive,
    biometricEnabled,
    totpEnabled,
    setTotpEnabled,
    categories,
    currentView,
    setCurrentView,
    handleLoginSuccess,
    handleBiometricUnlock,
    handleUsePasswordFromLock,
    handleDisableBiometric,
    handleLogout: sessionLogout,
    fetchCategories,
    storageKeys,
  } = session;

  const [resultData, setResultData] = useState<ReceiptScanInitialData | null>(null);
  const [scanReturnView, setScanReturnView] = useState<AppViewType>('main');
  const [targetReceipt, setTargetReceipt] = useState<ReceiptForSplitEditor | null>(null);
  const refreshTrayRef = useRef<(() => Promise<void>) | null>(null);

  useEffect(() => {
    if (!isReady) return;
    void AsyncStorage.getItem(storageKeys.RESULT).then((res) => {
      if (res) setResultData(JSON.parse(res));
    });
  }, [isReady, storageKeys.RESULT]);

  useEffect(() => {
    if (!isReady || !userToken) return;
    const saveState = async () => {
      try {
        await AsyncStorage.setItem(storageKeys.VIEW, currentView);
        if (resultData) {
          await AsyncStorage.setItem(storageKeys.RESULT, JSON.stringify(resultData));
        } else {
          await AsyncStorage.removeItem(storageKeys.RESULT);
        }
      } catch (e) {
        console.error('保存失敗', e);
      }
    };
    void saveState();
  }, [currentView, isReady, resultData, storageKeys.RESULT, storageKeys.VIEW, userToken]);

  const handleAnalysisReady = useCallback((data: ReceiptScanInitialData) => {
    setScanReturnView('main');
    setResultData(data);
    setCurrentView('receipt_scan');
  }, [setCurrentView]);

  const handleOpenScanFromTray = useCallback(
    (data: ReceiptScanInitialData) => {
      setScanReturnView(currentView === 'receipt_tray' ? 'receipt_tray' : 'main');
      setResultData(data);
      setCurrentView('receipt_scan');
    },
    [currentView, setCurrentView]
  );

  const handleScanClose = useCallback(
    (options?: { refreshTray?: boolean }) => {
      if (options?.refreshTray) {
        void refreshTrayRef.current?.();
      }
      setResultData(null);
      setCurrentView(scanReturnView);
    },
    [scanReturnView, setCurrentView]
  );

  const handleLogout = useCallback(async () => {
    await sessionLogout();
    setResultData(null);
    setTargetReceipt(null);
  }, [sessionLogout]);

  if (!isReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  const isFullWidth = FULL_WIDTH_VIEWS.includes(currentView);

  if (biometricLockActive && pendingSession) {
    return (
      <ResponsiveContainer fullWidth={false}>
        <BiometricLockScreen
          memberName={pendingSession.memberName}
          onUnlocked={() => void handleBiometricUnlock()}
          onUsePassword={() => void handleUsePasswordFromLock()}
        />
      </ResponsiveContainer>
    );
  }

  if (!userToken) {
    return (
      <ResponsiveContainer fullWidth={false}>
        <LoginScreen onLoginSuccess={handleLoginSuccess} />
      </ResponsiveContainer>
    );
  }

  const appBody = (
    <ResponsiveContainer fullWidth={isFullWidth}>
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        {currentView !== 'main' ? <DevEnvironmentBanner /> : null}
        <AppViewRouter
          currentView={currentView}
          setCurrentView={setCurrentView}
          currentMemberId={currentMemberId!}
          currentMemberName={currentMemberName}
          currentUserRole={currentUserRole}
          biometricEnabled={biometricEnabled}
          totpEnabled={totpEnabled}
          setTotpEnabled={setTotpEnabled}
          categories={categories}
          resultData={resultData}
          targetReceipt={targetReceipt}
          setTargetReceipt={setTargetReceipt}
          onAnalysisReady={handleAnalysisReady}
          onScanClose={handleScanClose}
          onLogout={() => void handleLogout()}
          onDisableBiometric={() => void handleDisableBiometric()}
          fetchCategories={fetchCategories}
        />
      </View>
    </ResponsiveContainer>
  );

  return (
    <SafeAreaProvider>
      <DisplayModeProvider>
        {currentMemberId ? (
          <ReceiptTrayProvider
            enabled
            onOpenScan={handleOpenScanFromTray}
            onRegisterRefresh={(refresh) => {
              refreshTrayRef.current = () => refresh();
            }}
          >
            {appBody}
          </ReceiptTrayProvider>
        ) : (
          appBody
        )}
      </DisplayModeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
});
