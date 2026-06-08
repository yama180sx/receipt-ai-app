import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Alert, ActivityIndicator, Text, TouchableOpacity } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SplashScreen from 'expo-splash-screen';

import apiClient, { setOnUnauthorized } from './src/utils/apiClient';
import { authService } from './src/services/authService';

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

import { theme } from './src/theme';
import { ResponsiveContainer } from './src/components/ResponsiveContainer';
import type { LoginResult } from './src/types/auth';

SplashScreen.preventAutoHideAsync().catch(() => {});

type ViewType = 'main' | 'history' | 'stats' | 'category_mgr' | 'product_master' | 'receipt_scan' | 'prompt_editor' | 'admin_stats' | 'admin_menu' | 'split_editor' | 'settlement_summary';

const STORAGE_KEYS = {
  VIEW: '@app_view',
  RESULT: '@app_result',
};

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [userToken, setUserToken] = useState<string | null>(null);
  const [currentMemberId, setCurrentMemberId] = useState<number | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);

  const [resultData, setResultData] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [currentView, setCurrentView] = useState<ViewType>('main');

  const [targetReceipt, setTargetReceipt] = useState<any>(null);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        const [session, v, res] = await Promise.all([
          authService.loadSession(),
          AsyncStorage.getItem(STORAGE_KEYS.VIEW),
          AsyncStorage.getItem(STORAGE_KEYS.RESULT),
        ]);

        if (session) {
          setUserToken(session.token);
          setCurrentMemberId(session.memberId);
          setCurrentUserRole(session.role);

          try {
            const catRes = await apiClient.get('/categories');
            if (catRes.data?.success) {
              setCategories(catRes.data.data);
            }
          } catch (catErr) {
            console.error('起動時のカテゴリマスタ先行取得失敗:', catErr);
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
  }, []);

  useEffect(() => {
    setOnUnauthorized(() => {
      handleLogout();
      Alert.alert('セッション切れ', '有効期限が切れたため、再度ログインしてください。');
    });
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

    setUserToken(result.token);
    setCurrentMemberId(result.member.id);
    setCurrentUserRole(result.member.role);
  };

  const handleLogout = async () => {
    await authService.logout();

    setUserToken(null);
    setCurrentMemberId(null);
    setCurrentUserRole(null);
    setCurrentView('main');
    setResultData(null);
    setTargetReceipt(null);
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

  const handleAnalysisReady = (data: any) => {
    setResultData(data);
    setCurrentView('receipt_scan');
  };

  if (!isReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  const isFullWidth = ['history', 'stats', 'category_mgr', 'product_master', 'receipt_scan', 'prompt_editor', 'admin_stats', 'admin_menu', 'split_editor', 'settlement_summary'].includes(currentView);

  if (!userToken) {
    return (
      <ResponsiveContainer fullWidth={false}>
        <LoginScreen onLoginSuccess={handleLoginSuccess} />
      </ResponsiveContainer>
    );
  }

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
        return (
          <SplitEditorScreen
            receipt={targetReceipt}
            onBack={() => {
              setTargetReceipt(null);
              setCurrentView('history');
            }}
          />
        );
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
      case 'receipt_scan':
        return (
          <ReceiptScanScreen
            initialData={resultData}
            categories={categories}
            onSuccess={() => {
              setResultData(null);
              setCurrentView('main');
            }}
            onCancel={() => {
              setResultData(null);
              setCurrentView('main');
            }}
          />
        );
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
      default:
        return (
          <View style={{ flex: 1 }}>
            <TouchableOpacity style={styles.logoutTrigger} onPress={handleLogout}>
              <Text style={styles.logoutText}>ログアウト</Text>
            </TouchableOpacity>

            <HomeScreen
              onAnalysisReady={handleAnalysisReady}
              onGoToHistory={() => setCurrentView('history')}
              onGoToStats={() => setCurrentView('stats')}
              onGoToSettlement={() => setCurrentView('settlement_summary')}
              onGoToAdminMenu={() => setCurrentView('admin_menu')}
              currentMemberId={memberId}
              userRole={currentUserRole}
            />
          </View>
        );
    }
  };

  return (
    <SafeAreaProvider>
      <ResponsiveContainer fullWidth={isFullWidth}>
        <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
          {renderMainContent()}
        </View>
      </ResponsiveContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background },
  logoutTrigger: { position: 'absolute', top: 60, right: 20, zIndex: 10, backgroundColor: 'rgba(0,0,0,0.05)', padding: 8, borderRadius: 10 },
  logoutText: { color: theme.colors.text.muted, fontSize: 12, fontWeight: 'bold' },
});
