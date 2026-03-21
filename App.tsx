import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image, Alert, ScrollView, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator'; 
import { Picker } from '@react-native-picker/picker';
import HistoryScreen from './HistoryScreen';
import { StatisticsScreen } from './src/screens/StatisticsScreen'; 

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

  const rotateImage = () => {
    setRotation(prev => (prev + 90) % 360);
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
      console.error('画像加工エラー:', error);
      Alert.alert('エラー', '画像の処理中に問題が発生しました。');
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
      
      if (!response.ok) throw new Error('学習APIの呼び出しに失敗しました');
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

  /**
   * 画像アップロード実行（Issue #22: 重複エラーハンドリング追加）
   */
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
        // --- 成功時 ---
        const data = result?.data ? { ...result.data } : null;
        if (data && 'rawText' in data) {
          delete (data as any).rawText;
        }
        setResultData(data);
        setImage(null); 
      } else if (response.status === 409) {
        // --- 重複エラー (Issue #22) ---
        Alert.alert(
          '登録済み',
          'このレシートは既に登録されています。\n二重登録はできません。',
          [{ text: 'OK', onPress: () => setImage(null) }] // プレビューを閉じる
        );
      } else {
        // --- その他のエラー ---
        throw new Error(result.error || 'アップロード失敗');
      }
    } catch (error: any) {
      // ネットワークエラーなどの例外処理
      Alert.alert('エラー', error.message);
    } finally {
      setUploading(false);
    }
  };

  if (currentView === 'history') return <HistoryScreen onBack={() => setCurrentView('main')} API_BASE={API_BASE} />;
  
  if (currentView === 'stats') return (
    <View style={{ flex: 1 }}>
      <StatisticsScreen />
      <TouchableOpacity style={styles.backButton} onPress={() => setCurrentView('main')}><Text style={styles.buttonText}>戻る</Text></TouchableOpacity>
    </View>
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>レシートAI解析</Text>
      
      {!resultData && image && (
        <View style={styles.previewContainer}>
          <Image 
            source={{ uri: image }} 
            style={[styles.preview, { transform: [{ rotate: `${rotation}deg` }] }]} 
            resizeMode="contain" 
          />
          {!uploading && (
            <TouchableOpacity style={styles.rotateIcon} onPress={rotateImage}>
              <Text style={styles.rotateIconText}>↻ 90°</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
      
      {!resultData && (
        <TouchableOpacity 
          style={[styles.button, uploading && styles.buttonDisabled]} 
          onPress={image ? processAndUpload : takePhoto}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.buttonText}>{image ? 'この向きで解析' : 'レシートを撮影'}</Text>
          )}
        </TouchableOpacity>
      )}

      {image && !uploading && !resultData && (
        <TouchableOpacity 
          style={[styles.button, { marginTop: 10, backgroundColor: '#8E8E93' }]} 
          onPress={() => setImage(null)}
        >
          <Text style={styles.buttonText}>撮り直す</Text>
        </TouchableOpacity>
      )}

      {!uploading && !resultData && !image && (
        <>
          <TouchableOpacity 
            style={[styles.button, { marginTop: 15, backgroundColor: '#5856D6' }]} 
            onPress={() => setCurrentView('history')}
          >
            <Text style={styles.buttonText}>履歴を確認</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.button, { marginTop: 15, backgroundColor: '#FF9500' }]} 
            onPress={() => setCurrentView('stats')}
          >
            <Text style={styles.buttonText}>統計を確認</Text>
          </TouchableOpacity>
        </>
      )}

      {resultData && (
        <View style={styles.resultContainer}>
          <Text style={styles.storeName}>店舗: {resultData.storeName}</Text>
          <Text style={styles.total}>合計: ¥{resultData.totalAmount}</Text>
          <Text style={styles.sectionTitle}>明細・AI学習</Text>
          {resultData.items.map((item: any) => (
            <View key={item.id} style={styles.itemRow}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemPrice}>¥{item.price}</Text>
              </View>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={item.categoryId}
                  onValueChange={(val) => handleCategoryChange(item.id, val)}
                  style={styles.picker}
                  mode="dropdown"
                >
                  <Picker.Item label="未分類" value={null} color="#999" />
                  {categories.map(c => <Picker.Item key={c.id} label={c.name} value={c.id} />)}
                </Picker>
              </View>
            </View>
          ))}
          <TouchableOpacity 
            style={[styles.button, {marginTop: 30, backgroundColor: '#34C759', width: '100%'}]} 
            onPress={() => {setResultData(null); setImage(null);}}
          >
            <Text style={styles.buttonText}>完了</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingVertical: 60, alignItems: 'center', backgroundColor: '#f0f2f5' },
  title: { fontSize: 26, fontWeight: 'bold', marginBottom: 20, color: '#1a1a1a' },
  previewContainer: { width: 300, height: 400, marginBottom: 20, position: 'relative' },
  preview: { width: '100%', height: '100%', borderRadius: 15, backgroundColor: '#000' },
  rotateIcon: { position: 'absolute', bottom: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.6)', padding: 10, borderRadius: 25 },
  rotateIconText: { color: 'white', fontSize: 14, fontWeight: 'bold' },
  button: { backgroundColor: '#007AFF', padding: 16, borderRadius: 12, width: 220, alignItems: 'center', shadowOpacity: 0.1 },
  buttonDisabled: { backgroundColor: '#aeb9c4' },
  buttonText: { color: 'white', fontSize: 18, fontWeight: '600' },
  resultContainer: { width: '95%', marginTop: 10, padding: 20, backgroundColor: 'white', borderRadius: 16, elevation: 4 },
  storeName: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  total: { fontSize: 18, marginBottom: 15, color: '#007AFF', fontWeight: '700' },
  sectionTitle: { fontSize: 14, color: '#888', marginBottom: 10, textTransform: 'uppercase' },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 15, color: '#333', fontWeight: '500' },
  itemPrice: { fontSize: 13, color: '#666' },
  pickerWrapper: { flex: 1, height: 40, justifyContent: 'center', backgroundColor: '#f8f9fa', borderRadius: 8, marginLeft: 10, overflow: 'hidden' },
  picker: { width: '100%', transform: [{ scaleX: 0.9 }, { scaleY: 0.9 }] },
  backButton: { position: 'absolute', bottom: 40, alignSelf: 'center', backgroundColor: '#8E8E93', padding: 16, borderRadius: 12, width: 200, alignItems: 'center' }
});