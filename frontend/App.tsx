import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Alert, ActivityIndicator, Platform, TextInput, Text, TouchableOpacity } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
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
import { SettlementSummaryScreen } from './src/screens/SettlementSummaryScreen'; // ★ [Issue #80] 追加

import { theme } from './src/theme';
import { ResponsiveContainer } from './src/components/ResponsiveContainer';

SplashScreen.preventAutoHideAsync().catch(() => {});

// ★ 'settlement_summary' を追加
type ViewType = 'main' | 'history' | 'stats' | 'category_mgr' | 'product_master' | 'receipt_scan' | 'prompt_editor' | 'admin_stats' | 'admin_menu' | 'split_editor' | 'settlement_summary';

const STORAGE_KEYS = {
  VIEW: '@app_view',
  RESULT: '@app_result',
  MEMBER_ID: 'currentMemberId',
};

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [userToken, setUserToken] = useState<string | null>(null);
  const [currentMemberId, setCurrentMemberId] = useState<number | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [loginPassword, setLoginPassword] = useState('');

  const [resultData, setResultData] = useState<any>(null); 
  const [categories, setCategories] = useState<any[]>([]);
  const [currentView, setCurrentView] = useState<ViewType>('main');
  
  const [targetReceipt, setTargetReceipt] = useState<any>(null);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        const [token, midStr, role, v, res] = await Promise.all([
          authService.getToken(),
          Platform.OS === 'web'
            ? AsyncStorage.getItem(STORAGE_KEYS.MEMBER_ID)
            : SecureStore.getItemAsync(STORAGE_KEYS.MEMBER_ID),
          authService.getRole(),
          AsyncStorage.getItem(STORAGE_KEYS.VIEW),
          AsyncStorage.getItem(STORAGE_KEYS.RESULT),
        ]);

        if (token) {
          setUserToken(token);
          setCurrentMemberId(midStr ? parseInt(midStr, 10) : 1);
          setCurrentUserRole(role);

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
      Alert.alert("セッション切れ", "有効期限が切れたため、再度ログインしてください。");
    });
  }, []);

  const handleLogin = async (memberId: number) => {
    if (!loginPassword) {
      Alert.alert("入力エラー", "パスワードを入力してください。");
      return;
    }

    try {
      const response = await apiClient.post('/auth/login', { 
        memberId, 
        password: loginPassword 
      });
      
      if (response.data && response.data.success) {
        const { token, member } = response.data.data;
        
        await authService.saveToken(token);
        if (member.role) {
          await authService.saveRole(member.role);
          setCurrentUserRole(member.role);
        }

        if (Platform.OS === 'web') {
          await AsyncStorage.setItem(STORAGE_KEYS.MEMBER_ID, member.id.toString());
        } else {
          await SecureStore.setItemAsync(STORAGE_KEYS.MEMBER_ID, member.id.toString());
        }
        
        setUserToken(token);
        setCurrentMemberId(member.id);
        setLoginPassword('');
        fetchCategories();
      }
    } catch (e: any) {
      Alert.alert("認証エラー", "ログインに失敗しました。");
      setLoginPassword('');
    }
  };

  const handleLogout = async () => {
    await authService.logout();
    if (Platform.OS === 'web') {
      await AsyncStorage.removeItem(STORAGE_KEYS.MEMBER_ID);
    } else {
      await SecureStore.deleteItemAsync(STORAGE_KEYS.MEMBER_ID);
    }

    setUserToken(null);
    setCurrentMemberId(null);
    setCurrentUserRole(null);
    setCurrentView('main');
    setResultData(null);
    setTargetReceipt(null);
    setLoginPassword('');
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

  // ★ isFullWidth に 'settlement_summary' を追加
  const isFullWidth = ['history', 'stats', 'category_mgr', 'product_master', 'receipt_scan', 'prompt_editor', 'admin_stats', 'admin_menu', 'split_editor', 'settlement_summary'].includes(currentView);

  if (!userToken) {
    return (
      <ResponsiveContainer fullWidth={false}>
        <View style={styles.loginContainer}>
          <Text style={styles.loginTitle}>家計簿アプリ</Text>
          <Text style={styles.loginSub}>パスワードを入力して開始</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.passwordInput}
              placeholder="パスワードを入力"
              placeholderTextColor="rgba(255,255,255,0.6)"
              secureTextEntry={true}
              value={loginPassword}
              onChangeText={setLoginPassword}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          <TouchableOpacity style={styles.loginButton} onPress={() => handleLogin(1)}>
            <Text style={styles.loginButtonText}>自分 (ID: 1) でログイン</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.loginButton} onPress={() => handleLogin(2)}>
            <Text style={styles.loginButtonText}>その他 (ID: 2) でログイン</Text>
          </TouchableOpacity>
        </View>
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
      case 'settlement_summary': // ★ [Issue #80] 精算サマリー画面のルーティング追加
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
              // ★ [Issue #80] ハンドラを注入
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
  loginContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.primary, padding: 40 },
  loginTitle: { fontSize: 32, fontWeight: 'bold', color: 'white', marginBottom: 10 },
  loginSub: { fontSize: 16, color: 'rgba(255,255,255,0.8)', marginBottom: 30 },
  inputWrapper: { width: '100%', marginBottom: 20 },
  passwordInput: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    padding: 15,
    color: 'white',
    fontSize: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  loginButton: { backgroundColor: 'white', width: '100%', padding: 18, borderRadius: 15, marginBottom: 15, alignItems: 'center' },
  loginButtonText: { color: theme.colors.primary, fontWeight: 'bold', fontSize: 16 },
  logoutTrigger: { position: 'absolute', top: 60, right: 20, zIndex: 10, backgroundColor: 'rgba(0,0,0,0.05)', padding: 8, borderRadius: 10 },
  logoutText: { color: theme.colors.text.muted, fontSize: 12, fontWeight: 'bold' },
});