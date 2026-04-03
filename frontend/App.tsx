import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Alert, ActivityIndicator, Image, Text, TouchableOpacity, ScrollView } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator'; 
import { Picker } from '@react-native-picker/picker';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Issue #30 用の修正（legacy APIを使用）
// @ts-ignore
import * as FileSystem from 'expo-file-system/legacy';

// 共通APIクライアントをインポート
import apiClient from './src/utils/apiClient';

import { HomeScreen } from './src/screens/HomeScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import { StatisticsScreen } from './src/screens/StatisticsScreen'; 
import { CategoryManagementScreen } from './src/screens/CategoryManagementScreen'; 
import { theme } from './src/theme';

type ViewType = 'main' | 'history' | 'stats' | 'category_mgr';

const STORAGE_KEYS = {
  VIEW: '@app_view',
  IMAGE: '@app_image',
  ROTATION: '@app_rotation',
  RESULT: '@app_result'
};

export default function App() {
  const [image, setImage] = useState<string | null>(null);
  const [rotation, setRotation] = useState(0); 
  const [uploading, setUploading] = useState(false);
  const [resultData, setResultData] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [currentView, setCurrentView] = useState<ViewType>('main');
  const [isReady, setIsReady] = useState(false);

  // --- Issue #35: 世帯管理の状態を追加 (1: 自分, 2: その他) ---
  const [currentMemberId, setCurrentMemberId] = useState<number>(1);

  // --- Issue #30: ファイル削除ロジック ---
  const deleteTempFile = async (uri: string | null) => {
    if (!uri) return;
    try {
      await FileSystem.deleteAsync(uri, { idempotent: true });
      console.log(`[Cleanup] Successfully processed: ${uri}`);
    } catch (e) {
      console.warn('[Cleanup] Failed to delete temp file:', e);
    }
  };

  const fetchCategories = useCallback(async () => {
    try {
      const res = await apiClient.get('/categories');
      setCategories(res.data);
    } catch (err) {
      console.error('マスタ取得失敗:', err);
    }
  }, []);

  useEffect(() => {
    const restoreState = async () => {
      try {
        const [v, i, r, res] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.VIEW),
          AsyncStorage.getItem(STORAGE_KEYS.IMAGE),
          AsyncStorage.getItem(STORAGE_KEYS.ROTATION),
          AsyncStorage.getItem(STORAGE_KEYS.RESULT)
        ]);
        if (v) setCurrentView(v as ViewType);
        if (i) setImage(i);
        if (r) setRotation(parseInt(r, 10) || 0);
        if (res) setResultData(JSON.parse(res));
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
        resultData ? AsyncStorage.setItem(STORAGE_KEYS.RESULT, JSON.stringify(resultData)) : AsyncStorage.removeItem(STORAGE_KEYS.RESULT)
      ]);
    };
    saveState();
  }, [currentView, image, rotation, resultData, isReady]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const takePhoto = async () => {
    if (image) await deleteTempFile(image);

    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('権限エラー', 'カメラアクセスが必要です。');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ 
      allowsEditing: true, 
      quality: 0.7,
    });
    if (!result.canceled) {
      setImage(result.assets[0].uri);
      setRotation(0); 
      setResultData(null);
    }
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

      await uploadImage(manipulatedUri);

      await deleteTempFile(manipulatedUri);
      await deleteTempFile(image);
      setImage(null);

    } catch (error) {
      setUploading(false);
      Alert.alert('エラー', '画像処理に失敗しました。');
      if (manipulatedUri) await deleteTempFile(manipulatedUri);
    }
  };

  // --- Issue #35: 選択中の memberId を送信するように修正 ---
  const uploadImage = async (uri: string) => {
    const formData = new FormData();
    formData.append('image', { uri, name: 'receipt.jpg', type: 'image/jpeg' } as any);
    formData.append('memberId', currentMemberId.toString());

    try {
      const response = await apiClient.post('/receipts/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const responseData = response.data;
      if (responseData && responseData.data) {
        setResultData(responseData.data);
      } else {
        console.error('APIレスポンスの構造が不正です:', responseData);
        throw new Error('解析データの取得に失敗しました');
      }

    } catch (error: any) {
      const status = error.response?.status;
      const errorMessage = error.response?.data?.error || 'アップロード失敗';

      if (status === 409) {
        Alert.alert('登録済み', 'このレシートは既に登録されています。');
      } else {
        Alert.alert('エラー', errorMessage);
      }
      throw error;
    } finally {
      setUploading(false);
    }
  };

  const handleCategoryChange = async (itemId: number, categoryId: number | null) => {
    if (!categoryId) return;
    try {
      const response = await apiClient.patch(`/receipt-items/${itemId}`, { 
        categoryId: Number(categoryId) 
      });
      
      const updatedItem = response.data;
      if (!updatedItem) return;

      setResultData((prev: any) => {
        if (!prev || !prev.items) return prev;
        return {
          ...prev,
          items: prev.items.map((item: any) =>
            item.id === itemId ? { ...item, categoryId: updatedItem.categoryId, category: updatedItem.category } : item
          ),
        };
      });
    } catch (error: any) {
      Alert.alert('エラー', error.response?.data?.error || '更新に失敗しました');
    }
  };

  // --- Issue #35: 世帯切替UI ---
  const HouseholdSwitcher = () => (
    <View style={styles.switcherContainer}>
      <TouchableOpacity 
        style={[styles.switchButton, currentMemberId === 1 && styles.activeSwitch]} 
        onPress={() => setCurrentMemberId(1)}
      >
        <Text style={[styles.switchText, currentMemberId === 1 && styles.activeSwitchText]}>自分</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={[styles.switchButton, currentMemberId === 2 && styles.activeSwitch]} 
        onPress={() => setCurrentMemberId(2)}
      >
        <Text style={[styles.switchText, currentMemberId === 2 && styles.activeSwitchText]}>その他</Text>
      </TouchableOpacity>
    </View>
  );

  const renderContent = () => {
    if (!isReady) return <View style={styles.loadingContainer}><ActivityIndicator size="large" color={theme.colors.primary} /></View>;

    switch (currentView) {
      case 'history':
        return <HistoryScreen onBack={() => setCurrentView('main')} currentMemberId={currentMemberId}/>;
      case 'stats':
        return (
          <View style={{ flex: 1 }}>
            <StatisticsScreen currentMemberId={currentMemberId}/>
            <TouchableOpacity style={styles.floatingBackButton} onPress={() => setCurrentView('main')}>
              <Text style={styles.floatingBackButtonText}>ホームに戻る</Text>
            </TouchableOpacity>
          </View>
        );
      case 'category_mgr':
        return (
          <CategoryManagementScreen 
            onBack={() => {
              fetchCategories();
              setCurrentView('main');
            }} 
          />
        );
      default:
        return (
          <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
            {/* 解析中やプレビュー中でない時のみ切替スイッチを表示 */}
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
                        <Picker
                          selectedValue={item.categoryId}
                          onValueChange={(val) => handleCategoryChange(item.id, val)}
                          style={styles.picker}
                        >
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
                    {uploading ? <ActivityIndicator color="white" /> : <Text style={styles.mainButtonText}>解析開始</Text>}
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.subButton} onPress={async () => {
                    await deleteTempFile(image);
                    setImage(null);
                  }}>
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
                // HomeScreenにも現在の世帯IDを渡す
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
  floatingBackButton: { position: 'absolute', bottom: 30, alignSelf: 'center', backgroundColor: theme.colors.primary, paddingVertical: 12, paddingHorizontal: 30, borderRadius: theme.borderRadius.round, elevation: 5 },
  floatingBackButtonText: { color: 'white', fontWeight: 'bold' },
  previewContainer: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  preview: { width: '90%', height: '70%', borderRadius: 10 },
  previewActions: { width: '100%', padding: 20, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', position: 'absolute', bottom: 40 },
  mainButton: { backgroundColor: theme.colors.primary, paddingVertical: 16, paddingHorizontal: 32, borderRadius: theme.borderRadius.md, minWidth: 140, alignItems: 'center' },
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

  // 世帯切替UIスタイル
  switcherContainer: {
    flexDirection: 'row',
    paddingTop: 50, // SafeArea相当の余白
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