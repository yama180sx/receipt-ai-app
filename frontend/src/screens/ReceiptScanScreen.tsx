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
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import apiClient from '../utils/apiClient';
import { theme } from '../theme';

const { width: windowWidth } = Dimensions.get('window');

// 型定義
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
 * [Issue #49-8] レシート解析結果の確認・編集画面 (React Native 完全対応版)
 * Web用タグを全て排除し、ネイティブコンポーネントに置き換えました。
 */
export const ReceiptScanScreen: React.FC<ReceiptScanScreenProps> = ({
  initialData,
  categories,
  onSuccess,
  onCancel,
}) => {
  const [loading, setLoading] = useState(false);
  const [receiptData, setReceiptData] = useState(initialData.parsedData);

  // 明細から計算した合計金額
  const calculatedTotal = useMemo(() => {
    return receiptData.items.reduce((sum, item) => sum + (Number(item.price) * Number(item.quantity || 1)), 0);
  }, [receiptData.items]);

  const updateBasicInfo = (key: string, value: string | number) => {
    setReceiptData(prev => ({ ...prev, [key]: value }));
  };

  const updateItem = (index: number, key: keyof ReceiptItem, value: any) => {
    const newItems = [...receiptData.items];
    newItems[index] = { ...newItems[index], [key]: value };
    setReceiptData(prev => ({ ...prev, items: newItems }));
  };

  const removeItem = (index: number) => {
    setReceiptData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const addItem = () => {
    setReceiptData(prev => ({
      ...prev,
      items: [...prev.items, { name: '', price: 0, quantity: 1, categoryId: null }]
    }));
  };

  const handleCommit = async () => {
    setLoading(true);
    try {
      const payload = {
        jobId: initialData.jobId,
        parsedData: {
          ...receiptData,
          totalAmount: calculatedTotal // 計算後の値を採用
        },
        imagePath: initialData.imagePath,
        validation: initialData.validation
      };

      const res = await apiClient.post('/receipts/commit', payload);
      if (res.data?.success) {
        Alert.alert('成功', 'レシートを保存しました。');
        onSuccess();
      }
    } catch (err: any) {
      console.error('Commit error:', err);
      Alert.alert('エラー', '保存に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* ヘッダー */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onCancel} style={styles.headerButton}>
            <Text style={styles.cancelText}>戻る</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>解析結果の確認</Text>
          <TouchableOpacity 
            onPress={handleCommit} 
            disabled={loading}
            style={[styles.saveButton, loading && { opacity: 0.6 }]}
          >
            {loading ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Text style={styles.saveButtonText}>確定保存</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          
          {/* 画像プレビュー */}
          {initialData.imagePath ? (
            <View style={styles.imageContainer}>
              <Image 
                source={{ uri: `${apiClient.defaults.baseURL?.replace('/api', '')}/${initialData.imagePath}` }} 
                style={styles.receiptImage}
                resizeMode="contain"
              />
            </View>
          ) : (
            <View style={styles.noImageContainer}>
              <Text style={styles.noImageText}>画像を表示できません</Text>
            </View>
          )}

          {/* 警告表示 */}
          {initialData.validation?.isSuspicious && (
            <View style={styles.warningBox}>
              <Text style={styles.warningTitle}>⚠️ 解析結果に不整合の疑いがあります</Text>
              {initialData.validation.warnings.map((w, i) => (
                <Text key={i} style={styles.warningText}>・ {w}</Text>
              ))}
            </View>
          )}

          {/* 基本情報カード */}
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>基本情報</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>店舗名</Text>
              <TextInput
                style={styles.input}
                value={receiptData.storeName}
                onChangeText={(val) => updateBasicInfo('storeName', val)}
                placeholder="店名を入力"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>購入日</Text>
              <TextInput
                style={styles.input}
                value={receiptData.purchaseDate}
                onChangeText={(val) => updateBasicInfo('purchaseDate', val)}
                placeholder="YYYY-MM-DD"
              />
            </View>
            <View style={styles.totalDisplay}>
              <View>
                <Text style={styles.label}>解析された合計</Text>
                <Text style={styles.totalAmountText}>¥ {receiptData.totalAmount.toLocaleString()}</Text>
              </View>
              <View style={styles.calculatedContainer}>
                <Text style={styles.label}>明細の計算合計</Text>
                <Text style={[
                  styles.calculatedValue, 
                  calculatedTotal !== receiptData.totalAmount ? styles.errorText : styles.successText
                ]}>
                  ¥ {calculatedTotal.toLocaleString()}
                </Text>
              </View>
            </View>
          </View>

          {/* 明細一覧 */}
          <View style={styles.itemsHeader}>
            <Text style={styles.sectionLabel}>商品明細 ({receiptData.items.length})</Text>
            <TouchableOpacity onPress={addItem} style={styles.addButton}>
              <Text style={styles.addButtonText}>+ 明細を追加</Text>
            </TouchableOpacity>
          </View>

          {receiptData.items.map((item, idx) => (
            <View key={idx} style={styles.itemCard}>
              <View style={styles.itemHeaderRow}>
                <TextInput
                  style={styles.itemNameInput}
                  value={item.name}
                  onChangeText={(val) => updateItem(idx, 'name', val)}
                  placeholder="商品名"
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
                    onChangeText={(val) => updateItem(idx, 'price', parseInt(val) || 0)}
                  />
                </View>
                <View style={[styles.itemSubGroup, { flex: 0.5 }]}>
                  <Text style={styles.subLabel}>数量</Text>
                  <TextInput
                    style={styles.inputSmall}
                    value={String(item.quantity)}
                    keyboardType="numeric"
                    onChangeText={(val) => updateItem(idx, 'quantity', parseInt(val) || 1)}
                  />
                </View>
                <View style={styles.itemSubGroup}>
                  <Text style={styles.subLabel}>カテゴリ</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={item.categoryId}
                      onValueChange={(val) => updateItem(idx, 'categoryId', val)}
                      style={styles.picker}
                    >
                      <Picker.Item label="未設定" value={null} />
                      {categories.map(c => (
                        <Picker.Item key={c.id} label={c.name} value={c.id} />
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
    borderBottomColor: '#EEE',
    zIndex: 10
  },
  headerTitle: { fontSize: 17, fontWeight: 'bold', color: '#333' },
  headerButton: { padding: 4 },
  cancelText: { color: '#666', fontSize: 15 },
  saveButton: { backgroundColor: '#2563EB', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  saveButtonText: { color: 'white', fontWeight: 'bold' },
  scrollView: { flex: 1 },
  imageContainer: { width: '100%', height: 300, backgroundColor: '#111', marginBottom: 16 },
  receiptImage: { width: '100%', height: '100%' },
  noImageContainer: { width: '100%', height: 100, justifyContent: 'center', alignItems: 'center', backgroundColor: '#EEE' },
  noImageText: { color: '#AAA' },
  warningBox: { margin: 16, padding: 16, backgroundColor: '#FFFBEB', borderRadius: 12, borderWidth: 1, borderColor: '#FEF3C7' },
  warningTitle: { color: '#92400E', fontWeight: 'bold', marginBottom: 6, fontSize: 14 },
  warningText: { color: '#B45309', fontSize: 12, lineHeight: 18 },
  card: { backgroundColor: 'white', margin: 16, marginTop: 0, borderRadius: 16, padding: 16, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
  sectionLabel: { fontSize: 12, fontWeight: 'bold', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 11, color: '#6B7280', fontWeight: 'bold', marginBottom: 4 },
  input: { borderBottomWidth: 1, borderBottomColor: '#F3F4F6', paddingVertical: 8, fontSize: 16, color: '#111827', fontWeight: '500' },
  totalDisplay: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 8, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  totalAmountText: { fontSize: 24, fontWeight: 'bold', color: '#6B7280' },
  calculatedContainer: { alignItems: 'flex-end' },
  calculatedValue: { fontSize: 24, fontWeight: 'bold' },
  successText: { color: '#10B981' },
  errorText: { color: '#EF4444' },
  itemsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: 16, marginBottom: 12 },
  addButton: { backgroundColor: '#EFF6FF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  addButtonText: { color: '#2563EB', fontWeight: 'bold', fontSize: 13 },
  itemCard: { backgroundColor: 'white', marginHorizontal: 16, marginBottom: 12, borderRadius: 16, padding: 16, borderLeftWidth: 4, borderLeftColor: '#2563EB', elevation: 1 },
  itemHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  itemNameInput: { flex: 1, fontSize: 15, fontWeight: 'bold', color: '#111827' },
  deleteIcon: { fontSize: 18, color: '#D1D5DB', padding: 4 },
  itemDetailRow: { flexDirection: 'row', gap: 12 },
  itemSubGroup: { flex: 1 },
  subLabel: { fontSize: 10, color: '#9CA3AF', fontWeight: 'bold', marginBottom: 4 },
  inputSmall: { borderBottomWidth: 1, borderBottomColor: '#F3F4F6', paddingVertical: 4, fontSize: 14, color: '#374151', fontWeight: 'bold' },
  pickerContainer: { borderBottomWidth: 1, borderBottomColor: '#F3F4F6', height: 35, justifyContent: 'center' },
  picker: { width: '100%', height: 35 },
});

export default ReceiptScanScreen;