import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  StyleSheet,
  View,
  Alert,
  ActivityIndicator,
  Text,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SplashScreen from 'expo-splash-screen';

import apiClient, { setOnUnauthorized } from './src/utils/apiClient';
import { authService } from './src/services/authService';
import { canUseBiometric } from './src/services/biometricService';

import { HomeScreen } from './src/screens/HomeScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import { StatisticsScreen } from './src/screens/StatisticsScreen';
import { CategoryManagementScreen } from './src/screens/CategoryManagementScreen';
import { ProductMasterScreen } from './src/screens/ProductMasterScreen';
import { ReceiptScanScreen } from './src/screens/ReceiptScanScreen';
import { PromptEditorScreen } from './src/screens/PromptEditorScreen';
import { AdminStatsScreen } from './src/screens/AdminStatsScreen';
import { AdminMenuScreen } from './src/screens/AdminMenuScreen';
import { SplitEditorScreen } from './src/screens/SplitEditorScreen';
import { SettlementSummaryScreen } from './src/screens/SettlementSummaryScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { BiometricLockScreen } from './src/screens/BiometricLockScreen';
import { ReceiptTrayScreen } from './src/screens/ReceiptTrayScreen';
import { ReceiptTrayProvider } from './src/contexts/ReceiptTrayContext';
import type { ReceiptScanInitialData } from './src/types/receiptScan';
import type { ReceiptForSplitEditor } from './src/types/settlement';

import { theme } from './src/theme';
import { ResponsiveContainer } from './src/components/ResponsiveContainer';
import { DisplayModeProvider } from './src/contexts/DisplayModeContext';
import { DisplayModeSettings } from './src/components/DisplayModeSettings';
import { DevEnvironmentBanner } from './src/components/DevEnvironmentBanner';
import { devUiColors, isDevAppEnv } from './src/config/appEnv';
import type { LoginResult, StoredSession } from './src/types/auth';

SplashScreen.preventAutoHideAsync().catch(() => {});

type ViewType = 'main' | 'history' | 'stats' | 'category_mgr' | 'product_master' | 'receipt_scan' | 'receipt_tray' | 'prompt_editor' | 'admin_stats' | 'admin_menu' | 'split_editor' | 'settlement_summary' | 'totp_settings';

const STORAGE_KEYS = {
  VIEW: '@app_view',
  RESULT: '@app_result',
};

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [userToken, setUserToken] = useState<string | null>(null);
  const [currentMemberId, setCurrentMemberId] = useState<number | null>(null);
  const [currentMemberName, setCurrentMemberName] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [pendingSession, setPendingSession] = useState<StoredSession | null>(null);
  const [biometricLockActive, setBiometricLockActive] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [totpEnabled, setTotpEnabled] = useState(false);

  const [resultData, setResultData] = useState<ReceiptScanInitialData | null>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [currentView, setCurrentView] = useState<ViewType>('main');
  const [scanReturnView, setScanReturnView] = useState<ViewType>('main');

  const [targetReceipt, setTargetReceipt] = useState<ReceiptForSplitEditor | null>(null);
  const refreshTrayRef = useRef<(() => Promise<void>) | null>(null);

  const applySession = useCallback((session: StoredSession) => {
    setUserToken(session.token);
    setCurrentMemberId(session.memberId);
    setCurrentMemberName(session.memberName);
    setCurrentUserRole(session.role);
  }, []);

  const fetchCategoriesForSession = useCallback(async () => {
    try {
      const catRes = await apiClient.get('/categories');
      if (catRes.data?.success) {
        setCategories(catRes.data.data);
      }
    } catch (catErr) {
      console.error('起動時のカテゴリマスタ先行取得失敗:', catErr);
    }
  }, []);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        const [session, bioEnabled, v, res] = await Promise.all([
          authService.loadSession(),
          authService.isBiometricEnabled(),
          AsyncStorage.getItem(STORAGE_KEYS.VIEW),
          AsyncStorage.getItem(STORAGE_KEYS.RESULT),
        ]);

        setBiometricEnabled(bioEnabled);

        if (session) {
          const needsBiometricLock = bioEnabled && Platform.OS !== 'web';
          if (needsBiometricLock) {
            setPendingSession(session);
            setBiometricLockActive(true);
          } else {
            applySession(session);
            await fetchCategoriesForSession();
          }
        }

        if (v) setCurrentView(v as ViewType);
        if (res) setResultData(JSON.parse(res));
      } catch (e) {
        console.error('初期化失敗', e);
      } finally {
        setIsReady(true);
        await SplashScreen.hideAsync().catch(() => {});
      }
    };
    initializeApp();
  }, [applySession, fetchCategoriesForSession]);

  useEffect(() => {
    setOnUnauthorized(() => {
      void handleLogout();
      Alert.alert('セッション切れ', '有効期限が切れたため、再度ログインしてください。');
    });
  }, []);

  const promptEnableBiometric = useCallback(async () => {
    if (Platform.OS === 'web') return;
    const available = await canUseBiometric();
    if (!available) return;

    Alert.alert(
      '生体認証',
      '次回起動時に生体認証でロック解除しますか？',
      [
        { text: 'あとで', style: 'cancel' },
        {
          text: '有効にする',
          onPress: async () => {
            await authService.setBiometricEnabled(true);
            setBiometricEnabled(true);
          },
        },
      ]
    );
  }, []);

  const handleLoginSuccess = async (
    result: LoginResult,
    context: { familyName: string; inviteCode: string }
  ) => {
    await authService.saveSession({
      token: result.token,
      member: result.member,
      familyGroupName: context.familyName,
      inviteCode: context.inviteCode,
    });

    applySession({
      token: result.token,
      memberId: result.member.id,
      memberName: result.member.name,
      familyGroupId: result.member.familyGroupId,
      familyGroupName: context.familyName,
      role: result.member.role,
    });
    setBiometricLockActive(false);
    setPendingSession(null);
    setTotpEnabled(Boolean(result.member.totpEnabled));
    await fetchCategoriesForSession();
    await promptEnableBiometric();
  };

  const handleBiometricUnlock = useCallback(async () => {
    if (!pendingSession) return;
    applySession(pendingSession);
    setBiometricLockActive(false);
    setPendingSession(null);
    await fetchCategoriesForSession();
  }, [applySession, fetchCategoriesForSession, pendingSession]);

  const handleUsePasswordFromLock = useCallback(async () => {
    await authService.logout();
    setPendingSession(null);
    setBiometricLockActive(false);
    setBiometricEnabled(false);
    setTotpEnabled(false);
    setUserToken(null);
    setCurrentMemberId(null);
    setCurrentMemberName(null);
    setCurrentUserRole(null);
    setCurrentView('main');
    setResultData(null);
    setTargetReceipt(null);
    setCategories([]);
  }, []);

  const handleDisableBiometric = useCallback(async () => {
    await authService.setBiometricEnabled(false);
    setBiometricEnabled(false);
    Alert.alert('生体認証', '生体認証によるロック解除をオフにしました。');
  }, []);

  const handleLogout = async () => {
    await authService.logout();

    setUserToken(null);
    setCurrentMemberId(null);
    setCurrentMemberName(null);
    setCurrentUserRole(null);
    setPendingSession(null);
    setBiometricLockActive(false);
    setBiometricEnabled(false);
    setTotpEnabled(false);
    setCurrentView('main');
    setResultData(null);
    setTargetReceipt(null);
    setCategories([]);
  };

  const fetchCategories = useCallback(async () => {
    if (!userToken) return;
    try {
      const res = await apiClient.get('/categories');
      if (res.data && res.data.success) {
        setCategories(res.data.data);
      }
    } catch (err) {
      console.error('マスタ取得失敗:', err);
    }
  }, [userToken]);

  useEffect(() => {
    if (isReady && userToken && categories.length === 0) {
      fetchCategories();
    }
  }, [fetchCategories, isReady, userToken, categories.length]);

  useEffect(() => {
    if (!isReady || !userToken) return;
    const saveState = async () => {
      try {
        await AsyncStorage.setItem(STORAGE_KEYS.VIEW, currentView);
        if (resultData) {
          await AsyncStorage.setItem(STORAGE_KEYS.RESULT, JSON.stringify(resultData));
        } else {
          await AsyncStorage.removeItem(STORAGE_KEYS.RESULT);
        }
      } catch (e) {
        console.error('保存失敗', e);
      }
    };
    saveState();
  }, [currentView, resultData, isReady, userToken]);

  const handleAnalysisReady = (data: ReceiptScanInitialData) => {
    setScanReturnView('main');
    setResultData(data);
    setCurrentView('receipt_scan');
  };

  const handleOpenScanFromTray = useCallback(
    (data: ReceiptScanInitialData) => {
      setScanReturnView(currentView === 'receipt_tray' ? 'receipt_tray' : 'main');
      setResultData(data);
      setCurrentView('receipt_scan');
    },
    [currentView]
  );

  const handleScanClose = useCallback(
    (options?: { refreshTray?: boolean }) => {
      if (options?.refreshTray) {
        void refreshTrayRef.current?.();
      }
      setResultData(null);
      setCurrentView(scanReturnView);
    },
    [scanReturnView]
  );

  if (!isReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  const isFullWidth = ['history', 'stats', 'category_mgr', 'product_master', 'receipt_scan', 'receipt_tray', 'prompt_editor', 'admin_stats', 'admin_menu', 'split_editor', 'settlement_summary', 'totp_settings'].includes(currentView);

  if (biometricLockActive && pendingSession) {
    return (
      <ResponsiveContainer fullWidth={false}>
        <BiometricLockScreen
          memberName={pendingSession.memberName}
          onUnlocked={handleBiometricUnlock}
          onUsePassword={handleUsePasswordFromLock}
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

  const devToolbarStyle = isDevAppEnv()
    ? { backgroundColor: devUiColors.toolbarBg, borderBottomColor: devUiColors.toolbarBorder }
    : null;

  const renderMainContent = () => {
    const memberId = currentMemberId!;

    switch (currentView) {
      case 'history':
        return (
          <HistoryScreen
            onBack={() => setCurrentView('main')}
            currentMemberId={memberId}
            onGoToSplitEditor={(receipt) => {
              setTargetReceipt(receipt);
              setCurrentView('split_editor');
            }}
          />
        );
      case 'split_editor':
        return targetReceipt ? (
          <SplitEditorScreen
            receipt={targetReceipt}
            onBack={() => {
              setTargetReceipt(null);
              setCurrentView('history');
            }}
          />
        ) : null;
      case 'settlement_summary':
        return (
          <SettlementSummaryScreen
            onBack={() => setCurrentView('main')}
          />
        );
      case 'stats':
        return <StatisticsScreen currentMemberId={memberId} onBack={() => setCurrentView('main')} />;
      case 'category_mgr':
        return <CategoryManagementScreen onBack={() => { fetchCategories(); setCurrentView('admin_menu'); }} currentMemberId={memberId} />;
      case 'product_master':
        return <ProductMasterScreen onBack={() => setCurrentView('admin_menu')} currentMemberId={memberId} />;
      case 'receipt_tray':
        return <ReceiptTrayScreen onBack={() => setCurrentView('main')} />;
      case 'receipt_scan':
        return resultData ? (
          <ReceiptScanScreen
            initialData={resultData}
            categories={categories}
            onSuccess={() => handleScanClose({ refreshTray: true })}
            onCancel={() => handleScanClose()}
          />
        ) : null;
      case 'prompt_editor':
        return <PromptEditorScreen onBack={() => setCurrentView('admin_menu')} />;
      case 'admin_stats':
        return <AdminStatsScreen onBack={() => setCurrentView('admin_menu')} />;
      case 'admin_menu':
        return (
          <AdminMenuScreen
            onBack={() => setCurrentView('main')}
            onGoToCategories={() => setCurrentView('category_mgr')}
            onGoToProductMaster={() => setCurrentView('product_master')}
            onGoToPromptEditor={() => setCurrentView('prompt_editor')}
            onGoToAdminStats={() => setCurrentView('admin_stats')}
          />
        );
      case 'totp_settings':
        return (
          <TotpSettingsScreen
            totpEnabled={totpEnabled}
            onBack={() => setCurrentView('main')}
            onChanged={setTotpEnabled}
          />
        );
      default:
        return (
          <View style={styles.mainWithToolbar}>
            <DevEnvironmentBanner />
            <SafeAreaView edges={['top']} style={[styles.mainToolbar, devToolbarStyle]}>
              <View style={styles.topActions}>
                <DisplayModeSettings />
                <View style={styles.topActionButtons}>
                  {currentMemberName ? (
                    <Text style={styles.memberNameText} numberOfLines={1}>
                      {currentMemberName}
                    </Text>
                  ) : null}
                  {biometricEnabled && Platform.OS !== 'web' ? (
                    <TouchableOpacity style={styles.topActionButton} onPress={handleDisableBiometric}>
                      <Text style={styles.topActionText}>生体認証オフ</Text>
                    </TouchableOpacity>
                  ) : null}
                  <TouchableOpacity style={styles.topActionButton} onPress={handleLogout}>
                    <Text style={styles.topActionText}>ログアウト</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </SafeAreaView>

            <HomeScreen
              onAnalysisReady={handleAnalysisReady}
              onGoToHistory={() => setCurrentView('history')}
              onGoToStats={() => setCurrentView('stats')}
              onGoToReceiptTray={() => setCurrentView('receipt_tray')}
              onGoToSettlement={() => setCurrentView('settlement_summary')}
              onGoToAdminMenu={() => setCurrentView('admin_menu')}
              currentMemberId={memberId}
              memberName={currentMemberName}
              userRole={currentUserRole}
            />
          </View>
        );
    }
  };

  const appBody = (
    <ResponsiveContainer fullWidth={isFullWidth}>
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        {userToken && currentView !== 'main' ? <DevEnvironmentBanner /> : null}
        {renderMainContent()}
      </View>
    </ResponsiveContainer>
  );

  return (
    <SafeAreaProvider>
      <DisplayModeProvider>
        {userToken && currentMemberId ? (
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
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background },
  mainWithToolbar: { flex: 1 },
  mainToolbar: {
    backgroundColor: theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  topActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  topActionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  topActionButton: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    padding: 8,
    borderRadius: 10,
  },
  topActionText: { color: theme.colors.text.muted, fontSize: 12, fontWeight: 'bold' },
  memberNameText: {
    color: theme.colors.text.main,
    fontSize: 13,
    fontWeight: '600',
    maxWidth: 120,
  },
});
