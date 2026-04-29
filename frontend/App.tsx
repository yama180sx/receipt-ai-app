import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Alert, ActivityIndicator, Platform, TextInput, Text, TouchableOpacity } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

import apiClient, { setOnUnauthorized } from './src/utils/apiClient';
import { authService } from './src/services/authService'; 

import { HomeScreen } from './src/screens/HomeScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import { StatisticsScreen } from './src/screens/StatisticsScreen'; 
import { CategoryManagementScreen } from './src/screens/CategoryManagementScreen'; 
import { ProductMasterScreen } from './src/screens/ProductMasterScreen'; 
import ReceiptScanScreen from './src/screens/ReceiptScanScreen'; // [Issue #49-8] 追加
import { theme } from './src/theme';
import { ResponsiveContainer } from './src/components/ResponsiveContainer';

// ビュータイプの定義に receipt_scan を追加
type ViewType = 'main' | 'history' | 'stats' | 'category_mgr' | 'product_master' | 'receipt_scan';

const STORAGE_KEYS = {
  VIEW: '@app_view',
  RESULT: '@app_result',
  MEMBER_ID: 'currentMemberId',
};

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [userToken, setUserToken] = useState<string | null>(null);
  const [currentMemberId, setCurrentMemberId] = useState<number | null>(null);
  const [loginPassword, setLoginPassword] = useState('');

  // メインステート
  const [resultData, setResultData] = useState<any>(null); // 解析済み一時データ
  const [categories, setCategories] = useState<any[]>([]);
  const [currentView, setCurrentView] = useState<ViewType>('main');

  /**
   * 1. 初期化と状態復元
   */
  useEffect(() => {
    const initializeApp = async () => {
      try {
        const token = await authService.getToken();
        const midStr = Platform.OS === 'web'
          ? await AsyncStorage.getItem(STORAGE_KEYS.MEMBER_ID)
          : await SecureStore.getItemAsync(STORAGE_KEYS.MEMBER_ID);

        if (token) {
          setUserToken(token);
          setCurrentMemberId(midStr ? parseInt(midStr, 10) : 1);
        }

        const [v, res] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.VIEW),
          AsyncStorage.getItem(STORAGE_KEYS.RESULT),
        ]);

        if (v) setCurrentView(v as ViewType);
        if (res) setResultData(JSON.parse(res));

      } catch (e) {
        console.error('初期化失敗', e);
      } finally {
        setIsReady(true);
      }
    };
    initializeApp();
  }, []);

  /**
   * 2. 認証エラーハンドリング
   */
  useEffect(() => {
    setOnUnauthorized(() => {
      handleLogout();
      Alert.alert("セッション切れ", "有効期限が切れたため、再度ログインしてください。");
    });
  }, []);

  /**
   * 3. ログイン処理
   */
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

  /**
   * 4. ログアウト処理
   */
  const handleLogout = async () => {
    await authService.logout();
    if (Platform.OS === 'web') {
      await AsyncStorage.removeItem(STORAGE_KEYS.MEMBER_ID);
    } else {
      await SecureStore.deleteItemAsync(STORAGE_KEYS.MEMBER_ID);
    }

    setUserToken(null);
    setCurrentMemberId(null);
    setCurrentView('main');
    setResultData(null);
    setLoginPassword('');
  };

  /**
   * 5. カテゴリマスタの取得
   */
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
    if (isReady && userToken) fetchCategories();
  }, [fetchCategories, isReady, userToken]);

  /**
   * 6. 永続化（現在の表示ビューと未保存の解析結果）
   */
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

  /**
   * 7. 解析完了時のハンドラ
   * HomeScreen から解析完了データを受け取って確認画面へ遷移
   */
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

  // フル幅表示の判定
  const isFullWidth = ['history', 'stats', 'category_mgr', 'product_master', 'receipt_scan'].includes(currentView);

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
        return <HistoryScreen onBack={() => setCurrentView('main')} currentMemberId={memberId}/>;
      case 'stats': 
        return <StatisticsScreen currentMemberId={memberId} onBack={() => setCurrentView('main')} />;
      case 'category_mgr': 
        return <CategoryManagementScreen onBack={() => { fetchCategories(); setCurrentView('main'); }} currentMemberId={memberId} />;
      case 'product_master': 
        return <ProductMasterScreen onBack={() => setCurrentView('main')} currentMemberId={memberId} />;
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
              onGoToCategories={() => setCurrentView('category_mgr')}
              onGoToProductMaster={() => setCurrentView('product_master')}
              currentMemberId={memberId}
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