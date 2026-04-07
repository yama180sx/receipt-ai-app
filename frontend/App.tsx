import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Alert, ActivityIndicator, Image, Text, TouchableOpacity, ScrollView } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator'; 
import { Picker } from '@react-native-picker/picker';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

// @ts-ignore
import * as FileSystem from 'expo-file-system/legacy';

import apiClient from './src/utils/apiClient';

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
  MEMBER_ID: '@app_member_id' // ★追加
};

export default function App() {
  const [image, setImage] = useState<string | null>(null);
  const [rotation, setRotation] = useState(0); 
  const [uploading, setUploading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('解析中...');
  const [resultData, setResultData] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [currentView, setCurrentView] = useState<ViewType>('main');
  const [isReady, setIsReady] = useState(false);
  const [currentMemberId, setCurrentMemberId] = useState<number>(1);

  const deleteTempFile = async (uri: string | null) => {
    if (!uri) return;
    try {
      await FileSystem.deleteAsync(uri, { idempotent: true });
    } catch (e) {
      console.warn('[Cleanup] Failed to delete temp file:', e);
    }
  };

  /**
   * [Issue #45] マスタ取得時にも世帯IDを付与
   */
  const fetchCategories = useCallback(async () => {
    try {
      const res = await apiClient.get('/categories', {
        headers: { 'x-member-id': currentMemberId.toString() }
      });
      if (res.data && res.data.success) {
        setCategories(res.data.data);
      }
    } catch (err) {
      console.error('マスタ取得失敗:', err);
    }
  }, [currentMemberId]);

  useEffect(() => {
    const restoreState = async () => {
      try {
        const [v, i, r, res, mid] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.VIEW),
          AsyncStorage.getItem(STORAGE_KEYS.IMAGE),
          AsyncStorage.getItem(STORAGE_KEYS.ROTATION),
          AsyncStorage.getItem(STORAGE_KEYS.RESULT),
          AsyncStorage.getItem(STORAGE_KEYS.MEMBER_ID)
        ]);
        if (v) setCurrentView(v as ViewType);
        if (i) setImage(i);
        if (r) setRotation(parseInt(r, 10) || 0);
        if (res) setResultData(JSON.parse(res));
        if (mid) setCurrentMemberId(parseInt(mid, 10) || 1);
      } catch (e) {
        console.error('復元失敗', e);
      } finally {
        setIsReady(true);
      }
    };
    restoreState();
  }, []);

  useEffect(() => {
    if (!isReady) return;
    const saveState = async () => {
      await Promise.all([
        AsyncStorage.setItem(STORAGE_KEYS.VIEW, currentView),
        image ? AsyncStorage.setItem(STORAGE_KEYS.IMAGE, image) : AsyncStorage.removeItem(STORAGE_KEYS.IMAGE),
        AsyncStorage.setItem(STORAGE_KEYS.ROTATION, rotation.toString()),
        resultData ? AsyncStorage.setItem(STORAGE_KEYS.RESULT, JSON.stringify(resultData)) : AsyncStorage.removeItem(STORAGE_KEYS.RESULT),
        AsyncStorage.setItem(STORAGE_KEYS.MEMBER_ID, currentMemberId.toString())
      ]);
    };
    saveState();
  }, [currentView, image, rotation, resultData, isReady, currentMemberId]);

  useEffect(() => {
    if (isReady) fetchCategories();
  }, [fetchCategories, isReady]);

  const takePhoto = async () => {
    if (image) await deleteTempFile(image);
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

  /**
   * [Issue #43 & #45] 非同期ポーリング処理
   */
  const pollJobStatus = async (jobId: string): Promise<any> => {
    let attempts = 0;
    const maxAttempts = 30; // 最大60秒
    const interval = 2000;

    while (attempts < maxAttempts) {
      attempts++;
      setLoadingMessage(`解析中... (${attempts * 2}s)`);

      // エンドポイントを /status/ に統一
      const res = await apiClient.get(`/receipts/status/${jobId}`, {
        headers: { 'x-member-id': currentMemberId.toString() }
      });
      
      const { state, result, error } = res.data.data;

      if (state === 'completed') {
        // Worker側の業務エラー（重複等）をハンドリング
        if (result && result.success === false) {
          throw new Error(result.message || '既に登録されているレシートです');
        }
        return result; 
      }
      
      if (state === 'failed') {
        throw new Error(error || '解析に失敗しました。');
      }

      await new Promise(resolve => setTimeout(resolve, interval));
    }
    throw new Error('解析がタイムアウトしました。T320の負荷を確認してください。');
  };

  const processAndUpload = async () => {
    if (!image) return;
    setUploading(true);
    setLoadingMessage('画像加工中...');
    let manipulatedUri: string | null = null;

    try {
      const manipulated = await manipulateAsync(
        image, 
        [{ resize: { width: 1200 } }, { rotate: rotation }], 
        { compress: 0.6, format: SaveFormat.JPEG }
      );
      manipulatedUri = manipulated.uri;

      setLoadingMessage('アップロード中...');
      const jobId = await uploadImage(manipulatedUri);

      setLoadingMessage('解析待ち...');
      const finalResult = await pollJobStatus(jobId);

      setResultData(finalResult);

      await deleteTempFile(manipulatedUri);
      await deleteTempFile(image);
      setImage(null);

    } catch (error: any) {
      const serverMessage = error.response?.data?.error || error.message;
      Alert.alert('お知らせ', serverMessage);
      if (serverMessage.includes('重複') || serverMessage.includes('登録')) {
        setImage(null);
      }
    } finally {
      setUploading(false);
      if (manipulatedUri) await deleteTempFile(manipulatedUri);
    }
  };

  const uploadImage = async (uri: string): Promise<string> => {
    const formData = new FormData();
    // @ts-ignore
    formData.append('image', { uri, name: 'receipt.jpg', type: 'image/jpeg' });
    formData.append('memberId', currentMemberId.toString());

    const response = await apiClient.post('/receipts/upload', formData, {
      headers: { 
        'Content-Type': 'multipart/form-data',
        'x-member-id': currentMemberId.toString() // ★追加
      },
    });

    if (response.data?.success && response.data.data?.jobId) {
      return response.data.data.jobId;
    } else {
      throw new Error('ジョブの登録に失敗しました');
    }
  };

  const handleCategoryChange = async (itemId: number, categoryId: number | null) => {
    try {
      const response = await apiClient.patch(`/receipt-items/${itemId}`, 
        { categoryId: categoryId ? Number(categoryId) : null },
        { headers: { 'x-member-id': currentMemberId.toString() } } // ★追加
      );
      if (response.data && response.data.success) {
        const updatedItem = response.data.data;
        setResultData((prev: any) => {
          if (!prev || !prev.items) return prev;
          return {
            ...prev,
            items: prev.items.map((item: any) =>
              item.id === itemId ? { ...item, categoryId: updatedItem.categoryId, category: updatedItem.category } : item
            ),
          };
        });
      }
    } catch (error: any) {
      Alert.alert('エラー', error.response?.data?.message || '更新に失敗しました');
    }
  };

  const HouseholdSwitcher = () => (
    <View style={styles.switcherContainer}>
      <TouchableOpacity style={[styles.switchButton, currentMemberId === 1 && styles.activeSwitch]} onPress={() => setCurrentMemberId(1)}>
        <Text style={[styles.switchText, currentMemberId === 1 && styles.activeSwitchText]}>自分</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.switchButton, currentMemberId === 2 && styles.activeSwitch]} onPress={() => setCurrentMemberId(2)}>
        <Text style={[styles.switchText, currentMemberId === 2 && styles.activeSwitchText]}>その他</Text>
      </TouchableOpacity>
    </View>
  );

  const renderContent = () => {
    if (!isReady) return <View style={styles.loadingContainer}><ActivityIndicator size="large" color={theme.colors.primary} /></View>;

    switch (currentView) {
      case 'history': return <HistoryScreen onBack={() => setCurrentView('main')} currentMemberId={currentMemberId}/>;
      case 'stats': return <StatisticsScreen currentMemberId={currentMemberId} onBack={() => setCurrentView('main')} />;
      case 'category_mgr': return <CategoryManagementScreen onBack={() => { fetchCategories(); setCurrentView('main'); }} />;
      case 'product_master': return <ProductMasterScreen onBack={() => setCurrentView('main')} currentMemberId={currentMemberId} />;
      default:
        return (
          <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
            {!resultData && !image && <HouseholdSwitcher />}
            {resultData && resultData.items ? (
              <ScrollView contentContainerStyle={styles.resultContainer}>
                <Text style={styles.resultHeader}>解析結果</Text>
                <View style={styles.resultCard}>
                  <Text style={styles.storeName}>{resultData.storeName || '不明な店舗'}</Text>
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
                    <Text style={styles.subButtonText}>回転 ↻</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.mainButton} onPress={processAndUpload} disabled={uploading}>
                    {uploading ? (
                      <View style={{ alignItems: 'center' }}>
                        <ActivityIndicator color="white" />
                        <Text style={{ color: 'white', fontSize: 10, marginTop: 4 }}>{loadingMessage}</Text>
                      </View>
                    ) : <Text style={styles.mainButtonText}>解析開始</Text>}
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.subButton} onPress={async () => { await deleteTempFile(image); setImage(null); }}>
                    <Text style={styles.subButtonText}>撮り直す</Text>
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
                currentMemberId={currentMemberId}
              />
            )}
          </View>
        );
    }
  };

  return (
    <SafeAreaProvider>
      {renderContent()}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background },
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
  switcherContainer: {
    flexDirection: 'row',
    paddingTop: 50, 
    paddingBottom: 15,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  switchButton: {
    paddingVertical: 8,
    paddingHorizontal: 40,
    borderRadius: 20,
    marginHorizontal: 8,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  activeSwitch: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  switchText: {
    color: theme.colors.text.muted,
    fontWeight: 'bold',
  },
  activeSwitchText: {
    color: '#fff',
  },
});