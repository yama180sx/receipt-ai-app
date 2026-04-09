import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Alert, ActivityIndicator, Image, Text, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator'; 
import { Picker } from '@react-native-picker/picker';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

// @ts-ignore
import * as FileSystem from 'expo-file-system/legacy';

// ★ apiClientからインターセプター制御用の関数をインポート
import apiClient, { setOnUnauthorized } from './src/utils/apiClient';
import { authService } from './src/services/authService'; 

import { HomeScreen } from './src/screens/HomeScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import { StatisticsScreen } from './src/screens/StatisticsScreen'; 
import { CategoryManagementScreen } from './src/screens/CategoryManagementScreen'; 
import { ProductMasterScreen } from './src/screens/ProductMasterScreen'; 
import { theme } from './src/theme';

type ViewType = 'main' | 'history' | 'stats' | 'category_mgr' | 'product_master';

const STORAGE_KEYS = {
  VIEW: '@app_view',
  IMAGE: '@app_image',
  ROTATION: '@app_rotation',
  RESULT: '@app_result',
};

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [userToken, setUserToken] = useState<string | null>(null);
  const [currentMemberId, setCurrentMemberId] = useState<number | null>(null);

  // メイン機能用ステート
  const [image, setImage] = useState<string | null>(null);
  const [rotation, setRotation] = useState(0); 
  const [uploading, setUploading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('解析中...');
  const [resultData, setResultData] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [currentView, setCurrentView] = useState<ViewType>('main');

  /**
   * 1. [Issue #52] 認証状態とアプリ状態の復元
   */
  useEffect(() => {
    const initializeApp = async () => {
      try {
        const [token, midStr] = await Promise.all([
          authService.getToken(),
          SecureStore.getItemAsync('currentMemberId')
        ]);

        if (token) {
          setUserToken(token);
          setCurrentMemberId(midStr ? parseInt(midStr, 10) : 1);
        }

        const [v, i, r, res] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.VIEW),
          AsyncStorage.getItem(STORAGE_KEYS.IMAGE),
          AsyncStorage.getItem(STORAGE_KEYS.ROTATION),
          AsyncStorage.getItem(STORAGE_KEYS.RESULT),
        ]);
        if (v) setCurrentView(v as ViewType);
        if (i) setImage(i);
        if (r) setRotation(parseInt(r, 10) || 0);
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
   * 2. [Issue #52] 401エラー（トークン切れ）の自動ハンドリング登録
   */
  useEffect(() => {
    setOnUnauthorized(() => {
      handleLogout();
      Alert.alert("セッション切れ", "有効期限が切れたため、再度ログインしてください。");
    });
  }, []);

  /**
   * 3. [Issue #52] ログイン処理（バックエンドAPI連携）
   */
  const handleLogin = async (memberId: number) => {
    try {
      // T320のバックエンドに対して本物のJWTを要求
      const response = await apiClient.post('/auth/login', { memberId });
      
      if (response.data && response.data.success) {
        const { token, member } = response.data.data;

        // SecureStore へ保存（永続化）
        await authService.saveToken(token);
        await SecureStore.setItemAsync('currentMemberId', member.id.toString());
        
        // ステート更新（UIが切り替わる）
        setUserToken(token);
        setCurrentMemberId(member.id);

        // ログイン直後のデータフェッチ
        fetchCategories();
      }
    } catch (e: any) {
      const errorMsg = e.response?.data?.message || "ログインに失敗しました。";
      Alert.alert("認証エラー", errorMsg);
    }
  };

  /**
   * 4. [Issue #52] ログアウト処理
   */
  const handleLogout = async () => {
    await authService.logout();
    await SecureStore.deleteItemAsync('currentMemberId');
    setUserToken(null);
    setCurrentMemberId(null);
    setCurrentView('main');
    setResultData(null);
    setImage(null);
  };

  /**
   * 業務ロジック
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

  useEffect(() => {
    if (!isReady || !userToken) return;
    const saveState = async () => {
      await Promise.all([
        AsyncStorage.setItem(STORAGE_KEYS.VIEW, currentView),
        image ? AsyncStorage.setItem(STORAGE_KEYS.IMAGE, image) : AsyncStorage.removeItem(STORAGE_KEYS.IMAGE),
        AsyncStorage.setItem(STORAGE_KEYS.ROTATION, rotation.toString()),
        resultData ? AsyncStorage.setItem(STORAGE_KEYS.RESULT, JSON.stringify(resultData)) : AsyncStorage.removeItem(STORAGE_KEYS.RESULT),
      ]);
    };
    saveState();
  }, [currentView, image, rotation, resultData, isReady, userToken]);

  const deleteTempFile = async (uri: string | null) => {
    if (!uri) return;
    try {
      await FileSystem.deleteAsync(uri, { idempotent: true });
    } catch (e) {
      console.warn('[Cleanup] Failed to delete temp file:', e);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('権限エラー', 'カメラアクセスが必要です。');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.7 });
    if (!result.canceled) {
      setImage(result.assets[0].uri);
      setRotation(0); 
      setResultData(null);
    }
  };

  const pollJobStatus = async (jobId: string): Promise<any> => {
    let attempts = 0;
    while (attempts < 30) {
      attempts++;
      setLoadingMessage(`解析中... (${attempts * 2}s)`);
      const res = await apiClient.get(`/receipts/status/${jobId}`);
      const { state, result, error } = res.data.data;
      if (state === 'completed') return result; 
      if (state === 'failed') throw new Error(error || '解析に失敗しました。');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    throw new Error('解析がタイムアウトしました。');
  };

  const processAndUpload = async () => {
    if (!image) return;
    setUploading(true);
    let manipulatedUri: string | null = null;
    try {
      const manipulated = await manipulateAsync(
        image, 
        [{ resize: { width: 1200 } }, { rotate: rotation }], 
        { compress: 0.6, format: SaveFormat.JPEG }
      );
      manipulatedUri = manipulated.uri;
      const formData = new FormData();
      // @ts-ignore
      formData.append('image', { uri: manipulatedUri, name: 'receipt.jpg', type: 'image/jpeg' });
      formData.append('memberId', currentMemberId?.toString() || "");

      const response = await apiClient.post('/receipts/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const jobId = response.data.data.jobId;
      const finalResult = await pollJobStatus(jobId);
      setResultData(finalResult);
      setImage(null);
    } catch (error: any) {
      Alert.alert('お知らせ', error.message);
    } finally {
      setUploading(false);
      if (manipulatedUri) await deleteTempFile(manipulatedUri);
    }
  };

  const handleCategoryChange = async (itemId: number, categoryId: number | null) => {
    try {
      const response = await apiClient.patch(`/receipt-items/${itemId}`, { 
        categoryId: categoryId ? Number(categoryId) : null 
      });
      if (response.data?.success) {
        const updatedItem = response.data.data;
        setResultData((prev: any) => ({
          ...prev,
          items: prev.items.map((item: any) =>
            item.id === itemId ? { ...item, categoryId: updatedItem.categoryId, category: updatedItem.category } : item
          ),
        }));
      }
    } catch (error: any) {
      Alert.alert('エラー', error.message);
    }
  };

  /**
   * 5. 画面レンダリングの分岐
   */
  if (!isReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  // 非ログイン時はログイン画面を表示
  if (!userToken) {
    return (
      <View style={styles.loginContainer}>
        <Text style={styles.loginTitle}>家計簿アプリ</Text>
        <Text style={styles.loginSub}>メンバーを選択して開始</Text>
        <TouchableOpacity style={styles.loginButton} onPress={() => handleLogin(1)}>
          <Text style={styles.loginButtonText}>自分 (ID: 1)</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.loginButton} onPress={() => handleLogin(2)}>
          <Text style={styles.loginButtonText}>その他 (ID: 2)</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ログイン済みのメインコンテンツ
  const renderMainContent = () => {
    const memberId = currentMemberId!;

    switch (currentView) {
      case 'history': return <HistoryScreen onBack={() => setCurrentView('main')} currentMemberId={memberId}/>;
      case 'stats': return <StatisticsScreen currentMemberId={memberId} onBack={() => setCurrentView('main')} />;
      case 'category_mgr': return <CategoryManagementScreen onBack={() => { fetchCategories(); setCurrentView('main'); }} currentMemberId={memberId} />;
      case 'product_master': return <ProductMasterScreen onBack={() => setCurrentView('main')} currentMemberId={memberId} />;
      default:
        return (
          <View style={{ flex: 1 }}>
            <TouchableOpacity style={styles.logoutTrigger} onPress={handleLogout}>
              <Text style={styles.logoutText}>ログアウト</Text>
            </TouchableOpacity>

            {resultData ? (
              <ScrollView contentContainerStyle={styles.resultContainer}>
                <Text style={styles.resultHeader}>解析結果</Text>
                <View style={styles.resultCard}>
                  <Text style={styles.storeName}>{resultData.storeName || '不明'}</Text>
                  <Text style={styles.totalAmount}>¥{(resultData.totalAmount || 0).toLocaleString()}</Text>
                  <View style={styles.divider} />
                  {resultData.items.map((item: any) => (
                    <View key={item.id} style={styles.itemRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.itemName}>{item.name}</Text>
                        <Text style={styles.itemPrice}>¥{(item.price || 0).toLocaleString()}</Text>
                      </View>
                      <View style={styles.pickerWrapper}>
                        <Picker selectedValue={item.categoryId} onValueChange={(val) => handleCategoryChange(item.id, val)} style={styles.picker}>
                          <Picker.Item label="未分類" value={null} color={theme.colors.text.muted} />
                          {categories.map(c => <Picker.Item key={c.id} label={c.name} value={c.id} />)}
                        </Picker>
                      </View>
                    </View>
                  ))}
                  <TouchableOpacity style={styles.doneButton} onPress={() => setResultData(null)}>
                    <Text style={styles.doneButtonText}>完了</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            ) : image ? (
              <View style={styles.previewContainer}>
                <Image source={{ uri: image }} style={[styles.preview, { transform: [{ rotate: `${rotation}deg` }] }]} resizeMode="contain" />
                <View style={styles.previewActions}>
                  <TouchableOpacity style={styles.subButton} onPress={() => setRotation(prev => (prev + 90) % 360)}>
                    <Text style={styles.subButtonText}>回転</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.mainButton} onPress={processAndUpload} disabled={uploading}>
                    {uploading ? <ActivityIndicator color="white" /> : <Text style={styles.mainButtonText}>解析開始</Text>}
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.subButton} onPress={() => setImage(null)}>
                    <Text style={styles.subButtonText}>削除</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <HomeScreen 
                onScan={takePhoto} 
                onGoToHistory={() => setCurrentView('history')}
                onGoToStats={() => setCurrentView('stats')}
                onGoToCategories={() => setCurrentView('category_mgr')}
                onGoToProductMaster={() => setCurrentView('product_master')}
                currentMemberId={memberId}
              />
            )}
          </View>
        );
    }
  };

  return (
    <SafeAreaProvider>
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        {renderMainContent()}
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background },
  loginContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.primary, padding: 40 },
  loginTitle: { fontSize: 32, fontWeight: 'bold', color: 'white', marginBottom: 10 },
  loginSub: { fontSize: 16, color: 'rgba(255,255,255,0.8)', marginBottom: 40 },
  loginButton: { backgroundColor: 'white', width: '100%', padding: 18, borderRadius: 15, marginBottom: 15, alignItems: 'center' },
  loginButtonText: { color: theme.colors.primary, fontWeight: 'bold', fontSize: 18 },
  logoutTrigger: { position: 'absolute', top: 60, right: 20, zIndex: 10, backgroundColor: 'rgba(0,0,0,0.05)', padding: 8, borderRadius: 10 },
  logoutText: { color: theme.colors.text.muted, fontSize: 12, fontWeight: 'bold' },
  previewContainer: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  preview: { width: '90%', height: '70%', borderRadius: 10 },
  previewActions: { width: '100%', padding: 20, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', position: 'absolute', bottom: 40 },
  mainButton: { backgroundColor: theme.colors.primary, paddingVertical: 16, paddingHorizontal: 20, borderRadius: theme.borderRadius.md, minWidth: 140, alignItems: 'center' },
  mainButtonText: { color: 'white', fontWeight: 'bold', fontSize: 18 },
  subButton: { backgroundColor: 'rgba(255,255,255,0.2)', paddingVertical: 12, paddingHorizontal: 20, borderRadius: theme.borderRadius.sm },
  subButtonText: { color: 'white', fontWeight: '600' },
  resultContainer: { padding: theme.spacing.lg, paddingTop: 60 },
  resultHeader: { ...theme.typography.h1, marginBottom: theme.spacing.lg, textAlign: 'center' },
  resultCard: { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.md, padding: theme.spacing.lg, borderWidth: 1, borderColor: theme.colors.border },
  storeName: { ...theme.typography.h2, color: theme.colors.text.main, marginBottom: 5 },
  totalAmount: { ...theme.typography.h1, color: theme.colors.primary, marginBottom: theme.spacing.md },
  divider: { height: 1, backgroundColor: theme.colors.border, marginBottom: theme.spacing.md },
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: theme.spacing.sm, borderBottomWidth: 1, borderBottomColor: theme.colors.background },
  itemName: { ...theme.typography.body, fontSize: 14 },
  itemPrice: { ...theme.typography.caption, fontWeight: '700' },
  pickerWrapper: { width: 120, height: 40, backgroundColor: theme.colors.background, borderRadius: theme.borderRadius.sm, overflow: 'hidden' },
  picker: { width: '100%' },
  doneButton: { backgroundColor: theme.colors.primary, padding: 16, borderRadius: theme.borderRadius.md, alignItems: 'center', marginTop: theme.spacing.xl },
  doneButtonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
});