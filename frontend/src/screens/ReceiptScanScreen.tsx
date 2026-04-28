import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import apiClient from '../utils/apiClient';
import { theme } from '../theme';

interface ReceiptItem {
  name: string;
  price: number;
  quantity: number;
  categoryId: number | null;
}

interface ReceiptScanScreenProps {
  initialData: {
    parsedData: {
      storeName: string;
      purchaseDate: string;
      totalAmount: number;
      items: ReceiptItem[];
    };
    imagePath: string;
    validation: {
      isSuspicious: boolean;
      warnings: string[];
    };
    jobId?: string;
  };
  categories: Array<{ id: number; name: string }>;
  onSuccess: () => void;
  onCancel: () => void;
}

/**
 * [Issue #49-8] レシート解析結果の確認・編集画面
 * Android Picker のクリッピング問題を解消し、視認性を最大化したバージョン
 */
export const ReceiptScanScreen: React.FC<ReceiptScanScreenProps> = ({
  initialData,
  categories,
  onSuccess,
  onCancel,
}) => {
  const [loading, setLoading] = useState(false);
  const [receiptData, setReceiptData] = useState(initialData.parsedData);

  const imageUri = useMemo(() => {
    if (!initialData.imagePath) return null;
    const baseUrl = apiClient.defaults.baseURL?.replace('/api', '') || '';
    const path = initialData.imagePath.startsWith('/') ? initialData.imagePath : `/${initialData.imagePath}`;
    return `${baseUrl}${path}`;
  }, [initialData.imagePath]);

  const calculatedTotal = useMemo(() => {
    return receiptData.items.reduce((sum, item) => sum + (Number(item.price) * Number(item.quantity || 1)), 0);
  }, [receiptData.items]);

  const updateItem = (index: number, key: keyof ReceiptItem, value: any) => {
    const newItems = [...receiptData.items];
    newItems[index] = { ...newItems[index], [key]: value };
    setReceiptData({ ...receiptData, items: newItems });
  };

  const removeItem = (index: number) => {
    const newItems = receiptData.items.filter((_, i) => i !== index);
    setReceiptData({ ...receiptData, items: newItems });
  };

  const addItem = () => {
    const newItems = [...receiptData.items, { name: '', price: 0, quantity: 1, categoryId: null }];
    setReceiptData({ ...receiptData, items: newItems });
  };

  const handleCommit = async () => {
    setLoading(true);
    try {
      const payload = {
        jobId: initialData.jobId,
        parsedData: { ...receiptData, totalAmount: calculatedTotal },
        imagePath: initialData.imagePath,
        validation: initialData.validation
      };
      const res = await apiClient.post('/receipts/commit', payload);
      if (res.data?.success) {
        Alert.alert('成功', 'レシートを保存しました。');
        onSuccess();
      }
    } catch (err: any) {
      Alert.alert('エラー', '保存に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onCancel} style={styles.headerButton}>
            <Text style={styles.cancelText}>戻る</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>解析結果の確認</Text>
          <TouchableOpacity onPress={handleCommit} disabled={loading} style={[styles.saveButton, loading && { opacity: 0.6 }]}>
            {loading ? <ActivityIndicator color="white" size="small" /> : <Text style={styles.saveButtonText}>確定保存</Text>}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {imageUri && (
            <View style={styles.imageContainer}>
              <Image source={{ uri: imageUri }} style={styles.receiptImage} resizeMode="contain" />
              <View style={styles.imageLabel}><Text style={styles.imageLabelText}>加工済みプレビュー</Text></View>
            </View>
          )}

          <View style={styles.card}>
            <Text style={styles.sectionLabel}>基本情報</Text>
            <TextInput 
              style={styles.input} 
              value={receiptData.storeName} 
              onChangeText={(val) => setReceiptData({...receiptData, storeName: val})} 
              placeholder="店舗名" 
            />
            <TextInput 
              style={styles.input} 
              value={receiptData.purchaseDate} 
              onChangeText={(val) => setReceiptData({...receiptData, purchaseDate: val})} 
              placeholder="購入日" 
            />
            <View style={styles.totalDisplay}>
              <Text style={styles.totalLabel}>合計 (計算)</Text>
              <Text style={styles.totalValue}>¥ {calculatedTotal.toLocaleString()}</Text>
            </View>
          </View>

          <View style={styles.itemsHeader}>
            <Text style={styles.sectionLabel}>商品明細 ({receiptData.items.length})</Text>
            <TouchableOpacity onPress={addItem} style={styles.addButton}>
              <Text style={styles.addButtonText}>+ 追加</Text>
            </TouchableOpacity>
          </View>

          {receiptData.items.map((item, idx) => (
            <View key={idx} style={styles.itemCard}>
              <View style={styles.itemHeaderRow}>
                <TextInput 
                  style={styles.itemNameInput} 
                  value={item.name} 
                  onChangeText={(val) => updateItem(idx, 'name', val)} 
                />
                <TouchableOpacity onPress={() => removeItem(idx)}>
                  <Text style={styles.deleteIcon}>🗑️</Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.itemDetailRow}>
                <View style={styles.itemSubGroup}>
                  <Text style={styles.subLabel}>単価</Text>
                  <TextInput 
                    style={styles.inputSmall} 
                    value={String(item.price)} 
                    keyboardType="numeric" 
                    onChangeText={(val) => updateItem(idx, 'price', val)} 
                  />
                </View>
                <View style={[styles.itemSubGroup, { flex: 0.4 }]}>
                  <Text style={styles.subLabel}>数</Text>
                  <TextInput 
                    style={styles.inputSmall} 
                    value={String(item.quantity)} 
                    keyboardType="numeric" 
                    onChangeText={(val) => updateItem(idx, 'quantity', val)} 
                  />
                </View>
                
                <View style={[styles.itemSubGroup, { flex: 1.6 }]}>
                  <Text style={styles.subLabel}>カテゴリ</Text>
                  <View style={styles.pickerWrapper}>
                    <Picker
                      selectedValue={item.categoryId}
                      onValueChange={(val) => updateItem(idx, 'categoryId', val)}
                      style={styles.picker}
                      mode="dropdown"
                      itemStyle={{ fontSize: 14, height: 55 }} // iOS用だが念のため
                    >
                      <Picker.Item label="未選択" value={null} color="#999" />
                      {categories.map(c => (
                        <Picker.Item key={c.id} label={c.name} value={c.id} color="#333" />
                      ))}
                    </Picker>
                  </View>
                </View>
              </View>
            </View>
          ))}
          <View style={{ height: 60 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 16, 
    backgroundColor: 'white', 
    borderBottomWidth: 1, 
    borderBottomColor: '#EEE' 
  },
  headerTitle: { fontSize: 17, fontWeight: 'bold', color: '#333' },
  cancelText: { color: '#666', fontSize: 15 },
  saveButton: { backgroundColor: '#2563EB', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  saveButtonText: { color: 'white', fontWeight: 'bold' },
  scrollView: { flex: 1 },
  imageContainer: { width: '100%', height: 280, backgroundColor: '#111', marginBottom: 16, position: 'relative' },
  receiptImage: { width: '100%', height: '100%' },
  imageLabel: { position: 'absolute', bottom: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  imageLabelText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  card: { backgroundColor: 'white', margin: 16, marginTop: 0, borderRadius: 16, padding: 16, elevation: 2 },
  sectionLabel: { fontSize: 12, fontWeight: 'bold', color: '#9CA3AF', textTransform: 'uppercase', marginBottom: 12 },
  input: { borderBottomWidth: 1, borderBottomColor: '#F3F4F6', paddingVertical: 8, fontSize: 16, color: '#111827', marginBottom: 12 },
  totalDisplay: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  totalLabel: { fontSize: 14, color: '#666' },
  totalValue: { fontSize: 22, fontWeight: 'bold', color: '#2563EB' },
  itemsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: 16, marginBottom: 12 },
  addButton: { backgroundColor: '#EFF6FF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  addButtonText: { color: '#2563EB', fontWeight: 'bold', fontSize: 13 },
  itemCard: { backgroundColor: 'white', marginHorizontal: 16, marginBottom: 12, borderRadius: 16, padding: 16, borderLeftWidth: 4, borderLeftColor: '#2563EB', elevation: 1 },
  itemHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  itemNameInput: { flex: 1, fontSize: 15, fontWeight: 'bold', color: '#111827' },
  deleteIcon: { fontSize: 18, color: '#D1D5DB' },
  itemDetailRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-end' },
  itemSubGroup: { flex: 1 },
  subLabel: { fontSize: 10, color: '#9CA3AF', fontWeight: 'bold', marginBottom: 4 },
  inputSmall: { borderBottomWidth: 1, borderBottomColor: '#F3F4F6', paddingVertical: 4, fontSize: 14, color: '#374151' },
  
  // Pickerまわりの改善
  pickerWrapper: { 
    borderWidth: 1, 
    borderColor: '#F3F4F6', 
    borderRadius: 8, 
    backgroundColor: '#FAFAFA',
    height: 55, // 高さをさらに確保
    justifyContent: 'center',
    overflow: 'hidden'
  },
  picker: { 
    width: '100%', 
    height: 55,
    color: '#333',
    ...Platform.select({
      android: {
        paddingTop: 0,
        paddingBottom: 0,
        marginLeft: -8 // Android特有の左余白を打ち消す
      }
    })
  },
  headerButton: { padding: 4 }
});

export default ReceiptScanScreen;