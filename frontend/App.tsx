import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Alert, ActivityIndicator, Image, Text, TouchableOpacity, ScrollView, TextInput, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator'; 
import { Picker } from '@react-native-picker/picker';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

// @ts-ignore
import * as FileSystem from 'expo-file-system/legacy';

import apiClient, { setOnUnauthorized } from './src/utils/apiClient';
import { authService } from './src/services/authService'; 

import { HomeScreen } from './src/screens/HomeScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import { StatisticsScreen } from './src/screens/StatisticsScreen'; 
import { CategoryManagementScreen } from './src/screens/CategoryManagementScreen'; 
import { ProductMasterScreen } from './src/screens/ProductMasterScreen'; 
import { theme } from './src/theme';

// [Issue #49-2] レスポンシブコンテナの追加
import { ResponsiveContainer } from './src/components/ResponsiveContainer';

type ViewType = 'main' | 'history' | 'stats' | 'category_mgr' | 'product_master';

const STORAGE_KEYS = {
  VIEW: '@app_view',
  IMAGE: '@app_image',
  ROTATION: '@app_rotation',
  RESULT: '@app_result',
  MEMBER_ID: 'currentMemberId', // SecureStore/AsyncStorage 共通キー
};

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [userToken, setUserToken] = useState<string | null>(null);
  const [currentMemberId, setCurrentMemberId] = useState<number | null>(null);

  // 認証用ステート
  const [loginPassword, setLoginPassword] = useState('');

  // メイン機能用ステート
  const [image, setImage] = useState<string | null>(null);
  const [rotation, setRotation] = useState(0); 
  const [uploading, setUploading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('解析中...');
  const [resultData, setResultData] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [currentView, setCurrentView] = useState<ViewType>('main');

  /**
   * 1. 状態復元
   * [Web対応] SecureStoreがWebで未定義のため、AsyncStorageへフォールバック
   */
  useEffect(() => {
    const initializeApp = async () => {
      try {
        const token = await authService.getToken();
        
        // Webブラウザの場合は AsyncStorage、モバイルの場合は SecureStore を使用
        const midStr = Platform.OS === 'web'
          ? await AsyncStorage.getItem(STORAGE_KEYS.MEMBER_ID)
          : await SecureStore.getItemAsync(STORAGE_KEYS.MEMBER_ID);

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

        if (res) {
          const parsed = JSON.parse(res);
          if (parsed && Array.isArray(parsed.items)) {
            setResultData(parsed);
          } else {
            await AsyncStorage.removeItem(STORAGE_KEYS.RESULT);
          }
        }

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

        // [Web対応] メンバーIDの保存先をプラットフォームで切り替え
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
      const errorMsg = e.response?.data?.message || "ログインに失敗しました。";
      Alert.alert("認証エラー", errorMsg);
      setLoginPassword('');
    }
  };

  /**
   * 4. ログアウト処理
   */
  const handleLogout = async () => {
    await authService.logout();
    
    // [Web対応] メンバーIDの削除
    if (Platform.OS === 'web') {
      await AsyncStorage.removeItem(STORAGE_KEYS.MEMBER_ID);
    } else {
      await SecureStore.deleteItemAsync(STORAGE_KEYS.MEMBER_ID);
    }

    setUserToken(null);
    setCurrentMemberId(null);
    setCurrentView('main');
    setResultData(null);
    setImage(null);
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
    if (isReady && userToken) fetchCategories();
  }, [fetchCategories, isReady, userToken]);

  useEffect(() => {
    if (!isReady || !userToken) return;
    const saveState = async () => {
      try {
        await Promise.all([
          AsyncStorage.setItem(STORAGE_KEYS.VIEW, currentView),
          image ? AsyncStorage.setItem(STORAGE_KEYS.IMAGE, image) : AsyncStorage.removeItem(STORAGE_KEYS.IMAGE),
          AsyncStorage.setItem(STORAGE_KEYS.ROTATION, rotation.toString()),
          resultData && Array.isArray(resultData.items) 
            ? AsyncStorage.setItem(STORAGE_KEYS.RESULT, JSON.stringify(resultData)) 
            : AsyncStorage.removeItem(STORAGE_KEYS.RESULT),
        ]);
      } catch (e) {
        console.error('保存失敗', e);
      }
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
      
      if (state === 'completed') {
        if (result && Array.isArray(result.items)) {
          return result;
        }
        throw new Error('解析結果が不完全です。もう一度お試しください。');
      } 
      
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
      setResultData(null);
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
        setResultData((prev: any) => {
          if (!prev?.items) return prev;
          return {
            ...prev,
            items: prev.items.map((item: any) =>
              item.id === itemId ? { ...item, categoryId: updatedItem.categoryId, category: updatedItem.category } : item
            ),
          };
        });
      }
    } catch (error: any) {
      Alert.alert('エラー', error.message);
    }
  };

  if (!isReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  // ★ 追加：現在のビューがフル幅（全幅）表示を許可すべき画面かどうかを判定
  const isFullWidth = ['history', 'stats', 'category_mgr', 'product_master'].includes(currentView);

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

            {resultData && Array.isArray(resultData.items) ? (
              <ScrollView contentContainerStyle={styles.resultContainer} showsVerticalScrollIndicator={false}>
                <Text style={styles.resultHeader}>解析結果</Text>

                {resultData.isSuspicious && (
                  <View style={styles.warningContainer}>
                    <Text style={styles.warningTitle}>⚠️ 数値の不整合・異常の疑い</Text>
                    {resultData.warnings?.map((w: string, idx: number) => (
                      <Text key={idx} style={styles.warningText}>・{w}</Text>
                    ))}
                    <Text style={styles.warningHint}>内容が正しいか、各明細の単価と数量を必ず確認してください。</Text>
                  </View>
                )}

                <View style={[styles.resultCard, resultData.isSuspicious && styles.suspiciousCard]}>
                  <Text style={styles.storeName}>{resultData.storeName || '不明'}</Text>
                  <Text style={styles.totalAmount}>¥{(resultData.totalAmount || 0).toLocaleString()}</Text>
                  <View style={styles.divider} />
                  {resultData.items?.map((item: any) => (
                    <View key={item.id} style={styles.itemRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                        <View style={styles.itemPriceDetailRow}>
                          <Text style={styles.itemPrice}>
                            ¥{((item.price || 0) * (item.quantity || 1)).toLocaleString()}
                          </Text>
                          <Text style={styles.itemSubText}>
                            (¥{(item.price || 0).toLocaleString()} × {item.quantity || 1})
                          </Text>
                        </View>
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
      {/* ★ 変更点: fullWidth プロパティに判定結果を渡す */}
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
  previewContainer: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  preview: { width: '90%', height: '70%', borderRadius: 10 },
  previewActions: { width: '100%', padding: 20, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', position: 'absolute', bottom: 40 },
  mainButton: { backgroundColor: theme.colors.primary, paddingVertical: 16, paddingHorizontal: 20, borderRadius: theme.borderRadius.md, minWidth: 140, alignItems: 'center' },
  mainButtonText: { color: 'white', fontWeight: 'bold', fontSize: 18 },
  subButton: { backgroundColor: 'rgba(255,255,255,0.2)', paddingVertical: 12, paddingHorizontal: 20, borderRadius: theme.borderRadius.sm },
  subButtonText: { color: 'white', fontWeight: '600' },
  resultContainer: { padding: theme.spacing.lg, paddingTop: 80, paddingBottom: 40 },
  resultHeader: { ...theme.typography.h1, marginBottom: theme.spacing.lg, textAlign: 'center' },
  warningContainer: { backgroundColor: '#FFF0F0', borderWidth: 1, borderColor: '#FFC0C0', borderRadius: 10, padding: 15, marginBottom: 20 },
  warningTitle: { color: '#D00000', fontWeight: 'bold', fontSize: 16, marginBottom: 8 },
  warningText: { color: '#600000', fontSize: 14, lineHeight: 20 },
  warningHint: { color: '#D00000', fontSize: 12, marginTop: 10, fontStyle: 'italic' },
  suspiciousCard: { borderColor: '#FFC0C0', borderWidth: 2 },
  resultCard: { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.md, padding: theme.spacing.lg, borderWidth: 1, borderColor: theme.colors.border },
  storeName: { ...theme.typography.h2, color: theme.colors.text.main, marginBottom: 5 },
  totalAmount: { ...theme.typography.h1, color: theme.colors.primary, marginBottom: theme.spacing.md },
  divider: { height: 1, backgroundColor: theme.colors.border, marginBottom: theme.spacing.md },
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: theme.spacing.sm, borderBottomWidth: 1, borderBottomColor: theme.colors.background },
  itemName: { ...theme.typography.body, fontSize: 14 },
  itemPriceDetailRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 2 },
  itemPrice: { ...theme.typography.caption, fontWeight: '700', color: theme.colors.primary },
  itemSubText: { fontSize: 10, color: theme.colors.text.muted, marginLeft: 4 },
  pickerWrapper: { width: 120, height: 40, backgroundColor: theme.colors.background, borderRadius: theme.borderRadius.sm, overflow: 'hidden' },
  picker: { width: '100%' },
  doneButton: { backgroundColor: theme.colors.primary, padding: 16, borderRadius: theme.borderRadius.md, alignItems: 'center', marginTop: theme.spacing.xl },
  doneButtonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
});