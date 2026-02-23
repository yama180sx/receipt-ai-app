import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image, Alert, ScrollView } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Picker } from '@react-native-picker/picker';
// 1. 作成した HistoryScreen をインポート
import HistoryScreen from './HistoryScreen';

export default function App() {
  const [image, setImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [resultData, setResultData] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  // 2. 表示画面を制御する State を追加
  const [currentView, setCurrentView] = useState<'main' | 'history'>('main');

  const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.32:3000/api';

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
    const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.8 });
    if (!result.canceled) {
      const uri = result.assets[0].uri;
      setImage(uri);
      uploadImage(uri);
    }
  };

  const handleCategoryChange = async (itemId: number, categoryId: number | null) => {
    if (!categoryId) return;
    try {
      const response = await fetch(`${API_BASE}/items/${itemId}/category`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryId }),
      });
      if (!response.ok) throw new Error('DB更新に失敗しました');
      const updatedItem = await response.json();
      setResultData((prev: any) => ({
        ...prev,
        items: prev.items.map((item: any) => 
          item.id === itemId ? { ...item, categoryId: updatedItem.categoryId, category: updatedItem.category } : item
        )
      }));
    } catch (error: any) {
      Alert.alert('エラー', error.message);
    }
  };

  const uploadImage = async (uri: string) => {
    setUploading(true);
    setResultData(null);
    const formData = new FormData();
    formData.append('image', { uri, name: 'receipt.jpg', type: 'image/jpeg' } as any);
    formData.append('memberId', '1');
    try {
      const response = await fetch(`${API_BASE}/receipts/upload`, { method: 'POST', body: formData });
      const result = await response.json();
      if (response.ok) {
        setResultData(result.data);
      } else {
        throw new Error(result.error || 'アップロード失敗');
      }
    } catch (error: any) {
      Alert.alert('エラー', error.message);
    } finally {
      setUploading(false);
    }
  };

  // 3. 履歴画面を表示する場合の条件分岐
  if (currentView === 'history') {
    return (
      <HistoryScreen 
        onBack={() => setCurrentView('main')} 
        API_BASE={API_BASE} 
      />
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>レシートAI解析</Text>
      
      {!resultData && image && <Image source={{ uri: image }} style={styles.preview} />}
      
      <TouchableOpacity 
        style={[styles.button, uploading && styles.buttonDisabled]} 
        onPress={takePhoto}
        disabled={uploading}
      >
        <Text style={styles.buttonText}>{uploading ? '解析中...' : 'レシートを撮影'}</Text>
      </TouchableOpacity>

      {/* 4. 履歴確認ボタンの追加 */}
      {!uploading && !resultData && (
        <TouchableOpacity 
          style={[styles.button, { marginTop: 15, backgroundColor: '#5856D6' }]} 
          onPress={() => setCurrentView('history')}
        >
          <Text style={styles.buttonText}>履歴を確認</Text>
        </TouchableOpacity>
      )}

      {resultData && (
        <View style={styles.resultContainer}>
          <Text style={styles.storeName}>店舗: {resultData.storeName}</Text>
          <Text style={styles.total}>合計: ¥{resultData.totalAmount}</Text>
          
          <Text style={styles.sectionTitle}>明細・カテゴリー修正</Text>
          
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
                  {categories.map(c => (
                    <Picker.Item key={c.id} label={c.name} value={c.id} />
                  ))}
                </Picker>
              </View>
            </View>
          ))}
          
          <TouchableOpacity 
            style={[styles.button, {marginTop: 30, backgroundColor: '#34C759', width: '100%'}]} 
            onPress={() => {
                setResultData(null);
                setImage(null);
            }}
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
  preview: { width: 300, height: 400, marginBottom: 20, borderRadius: 15 },
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
  picker: { width: '100%', transform: [{ scaleX: 0.9 }, { scaleY: 0.9 }] }
});