import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Alert, ActivityIndicator, Image, Text, TouchableOpacity, ScrollView } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator'; 
import { Picker } from '@react-native-picker/picker';

// 作成した各スクリーンのインポート
import { HomeScreen } from './src/screens/HomeScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import { StatisticsScreen } from './src/screens/StatisticsScreen'; 
import { theme } from './src/theme';

type ViewType = 'main' | 'history' | 'stats';
 
export default function App() {
  const [image, setImage] = useState<string | null>(null);
  const [rotation, setRotation] = useState(0); 
  const [uploading, setUploading] = useState(false);
  const [resultData, setResultData] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [currentView, setCurrentView] = useState<ViewType>('main');

  const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

  useEffect(() => {
    fetch(`${API_BASE}/categories`)
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(data => setCategories(data))
      .catch(err => console.error('マスタ取得失敗:', err));
  }, [API_BASE]);

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('権限エラー', 'カメラへのアクセス許可が必要です。');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({ 
      allowsEditing: true, 
      quality: 1.0 
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
    try {
      const manipulated = await manipulateAsync(
        image,
        [{ rotate: rotation }], 
        { compress: 0.6, format: SaveFormat.JPEG }
      );
      await uploadImage(manipulated.uri);
    } catch (error) {
      setUploading(false);
      Alert.alert('エラー', '画像処理に失敗しました。');
    }
  };

  const uploadImage = async (uri: string) => {
    const formData = new FormData();
    formData.append('image', { uri, name: 'receipt.jpg', type: 'image/jpeg' } as any);
    formData.append('memberId', '1');

    try {
      const response = await fetch(`${API_BASE}/receipts/upload`, { 
        method: 'POST', 
        body: formData 
      });
      const result = await response.json();
      
      if (response.ok) {
        setResultData(result.data);
        setImage(null); 
      } else if (response.status === 409) {
        Alert.alert('登録済み', 'このレシートは既に登録されています。', [{ text: 'OK', onPress: () => setImage(null) }]);
      } else {
        throw new Error(result.error || 'アップロード失敗');
      }
    } catch (error: any) {
      Alert.alert('エラー', error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleCategoryChange = async (itemId: number, categoryId: number | null) => {
    if (!categoryId) return;
    try {
      const response = await fetch(`${API_BASE}/receipt-items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryId: Number(categoryId) }),
      });
      const updatedItem = await response.json();
      setResultData((prev: any) => ({
        ...prev,
        items: prev.items.map((item: any) =>
          item.id === itemId ? { ...item, categoryId: updatedItem.categoryId, category: updatedItem.category } : item
        ),
      }));
    } catch (error: any) {
      Alert.alert('エラー', error.message);
    }
  };

  // --- ナビゲーション制御 ---
  if (currentView === 'history') {
    return <HistoryScreen onBack={() => setCurrentView('main')} API_BASE={API_BASE} />;
  }
  
  if (currentView === 'stats') {
    return (
      <View style={{ flex: 1 }}>
        <StatisticsScreen />
        <TouchableOpacity style={styles.floatingBackButton} onPress={() => setCurrentView('main')}>
          <Text style={styles.floatingBackButtonText}>ホームに戻る</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // --- メインビュー (HomeScreen または 撮影/解析ワークフロー) ---
  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      {resultData ? (
        // 1. 解析結果画面（Issue #21 でのデザイン調整済み）
        <ScrollView contentContainerStyle={styles.resultContainer}>
          <Text style={styles.resultHeader}>解析結果</Text>
          <View style={styles.resultCard}>
            <Text style={styles.storeName}>{resultData.storeName}</Text>
            <Text style={styles.totalAmount}>¥{resultData.totalAmount.toLocaleString()}</Text>
            <View style={styles.divider} />
            {resultData.items.map((item: any) => (
              <View key={item.id} style={styles.itemRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemPrice}>¥{item.price.toLocaleString()}</Text>
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
        // 2. プレビュー/アップロード待機画面
        <View style={styles.previewContainer}>
          <Image source={{ uri: image }} style={[styles.preview, { transform: [{ rotate: `${rotation}deg` }] }]} resizeMode="contain" />
          <View style={styles.previewActions}>
            <TouchableOpacity style={styles.subButton} onPress={() => setRotation(prev => (prev + 90) % 360)}>
              <Text style={styles.subButtonText}>回転 ↻</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.mainButton} onPress={processAndUpload} disabled={uploading}>
              {uploading ? <ActivityIndicator color="white" /> : <Text style={styles.mainButtonText}>解析開始</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.subButton} onPress={() => setImage(null)}>
              <Text style={styles.subButtonText}>撮り直す</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        // 3. ホーム画面 (Dashboard)
        <HomeScreen 
          onScan={takePhoto} 
          onGoToHistory={() => setCurrentView('history')}
          onGoToStats={() => setCurrentView('stats')}
          latestReceipt={undefined}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // 共通
  floatingBackButton: { position: 'absolute', bottom: 30, alignSelf: 'center', backgroundColor: theme.colors.primary, paddingVertical: 12, paddingHorizontal: 30, borderRadius: theme.borderRadius.round, elevation: 5 },
  floatingBackButtonText: { color: 'white', fontWeight: 'bold' },
  
  // プレビュー画面
  previewContainer: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  preview: { width: '90%', height: '70%', borderRadius: 10 },
  previewActions: { width: '100%', padding: 20, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', position: 'absolute', bottom: 40 },
  mainButton: { backgroundColor: theme.colors.primary, paddingVertical: 16, paddingHorizontal: 32, borderRadius: theme.borderRadius.md, minWidth: 140, alignItems: 'center' },
  mainButtonText: { color: 'white', fontWeight: 'bold', fontSize: 18 },
  subButton: { backgroundColor: 'rgba(255,255,255,0.2)', paddingVertical: 12, paddingHorizontal: 20, borderRadius: theme.borderRadius.sm },
  subButtonText: { color: 'white', fontWeight: '600' },

  // 解析結果画面
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
  doneButtonText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});