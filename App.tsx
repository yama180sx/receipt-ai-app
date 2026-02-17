import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

export default function App() {
  const [image, setImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // T320サーバーのURL
  const SERVER_URL = 'http://192.168.1.32:3000/api/receipts/upload';

  // カメラを起動して撮影する
  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('権限エラー', 'カメラへのアクセス許可が必要です。');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
      // 撮影後、自動でアップロードへ
      uploadImage(result.assets[0].uri);
    }
  };

  // 画像をT320へ送信する
  const uploadImage = async (uri: string) => {
    setUploading(true);
    
    const formData = new FormData();
    // FormDataに画像を添付（nameはserver.tsのupload.single('image')に合わせる）
    formData.append('image', {
      uri,
      name: 'receipt.jpg',
      type: 'image/jpeg',
    } as any);
    formData.append('memberId', '1'); // 管理者として送信

    try {
      const response = await fetch(SERVER_URL, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const result = await response.json();
      
      if (response.ok) {
        Alert.alert('成功', `解析完了！店舗: ${result.data.storeName}`);
      } else {
        throw new Error(result.error || 'アップロード失敗');
      }
    } catch (error: any) {
      Alert.alert('エラー', error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>レシートAI解析</Text>
      
      {image && <Image source={{ uri: image }} style={styles.preview} />}
      
      <TouchableOpacity 
        style={[styles.button, uploading && styles.buttonDisabled]} 
        onPress={takePhoto}
        disabled={uploading}
      >
        <Text style={styles.buttonText}>
          {uploading ? '解析中...' : 'レシートを撮影する'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5f5f5' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  preview: { width: 300, height: 400, marginBottom: 20, borderRadius: 10 },
  button: { backgroundColor: '#007AFF', padding: 15, borderRadius: 10, width: 200, alignItems: 'center' },
  buttonDisabled: { backgroundColor: '#ccc' },
  buttonText: { color: 'white', fontSize: 18, fontWeight: 'bold' }
});