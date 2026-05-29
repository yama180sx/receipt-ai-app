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

const c = theme.colors;
const s = theme.colors.semantic.scan;

interface ReceiptItem {
  name: string;
  price: number | string; // 入力中は文字列を許容
  quantity: number | string; // 入力中は文字列を許容
  categoryId: number | null;
}

interface ReceiptScanScreenProps {
  initialData: {
    parsedData: {
      storeName: string;
      purchaseDate: string;
      totalAmount: number;
      taxAmount?: number | string; 
      items: ReceiptItem[];
      usageLogId?: number; // ★ Issue #63: ログIDの型定義を追加して引き回しを保証
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
 * [Issue #67 / #71 / #63] レシート解析結果の確認・編集画面
 * - 外税(taxAmount)の編集・合算に対応
 * - 単価・数量の小数点入力対応
 * - 解析コスト紐付け用 usageLogId のポストに対応
 */
export const ReceiptScanScreen: React.FC<ReceiptScanScreenProps> = ({
  initialData,
  categories,
  onSuccess,
  onCancel,
}) => {
  const [loading, setLoading] = useState(false);
  // 初期値に taxAmount がない場合へのフォールバック
  const [receiptData, setReceiptData] = useState({
    ...initialData.parsedData,
    taxAmount: initialData.parsedData.taxAmount ?? '0',
  });

  const imageUri = useMemo(() => {
    if (!initialData.imagePath) return null;
    const baseUrl = apiClient.defaults.baseURL?.replace('/api', '') || '';
    const path = initialData.imagePath.startsWith('/') ? initialData.imagePath : `/${initialData.imagePath}`;
    return `${baseUrl}${path}`;
  }, [initialData.imagePath]);

  // 合計金額の計算（明細合計 + 外税）
  const calculatedTotal = useMemo(() => {
    const itemsTotal = receiptData.items.reduce((sum, item) => {
      const p = parseFloat(String(item.price)) || 0;
      const q = parseFloat(String(item.quantity)) || 0;
      return sum + (p * q);
    }, 0);
    
    const tax = parseFloat(String(receiptData.taxAmount)) || 0;
    // 日本円のため最終的な支払額は四捨五入して整数化
    return Math.round(itemsTotal + tax);
  }, [receiptData.items, receiptData.taxAmount]);

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
    if (loading) return;
    setLoading(true);
    try {
      const payload = {
        jobId: initialData.jobId,
        parsedData: { 
          ...receiptData, 
          totalAmount: calculatedTotal,
          taxAmount: parseFloat(String(receiptData.taxAmount)) || 0,
          items: receiptData.items.map(item => ({
            ...item,
            price: parseFloat(String(item.price)) || 0,
            quantity: parseFloat(String(item.quantity)) || 0,
            categoryId: item.categoryId ? Number(item.categoryId) : null
          }))
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
      const apiError = err.response?.data;
      console.error('Commit error:', apiError || err.message);

      if (apiError?.message === 'DUPLICATE') {
        Alert.alert(
          '既に登録済みです',
          '同じ店名・日付・金額のレシートが世帯内に存在します。履歴画面で確認してください。',
          [{ text: 'OK' }],
        );
        return;
      }

      Alert.alert('エラー', apiError?.message || '保存に失敗しました。');
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
            {loading ? <ActivityIndicator color={c.text.inverse} size="small" /> : <Text style={styles.saveButtonText}>確定保存</Text>}
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
              placeholder="購入日時 (YYYY-MM-DD HH:mm)" 
            />
            
            {/* [Issue #71] 消費税(外税)入力フィールド */}
            <View style={styles.taxInputRow}>
              <Text style={styles.taxLabel}>消費税 (外税・加算額)</Text>
              <TextInput 
                style={styles.taxInput} 
                value={String(receiptData.taxAmount)} 
                keyboardType="decimal-pad"
                onChangeText={(val) => setReceiptData({...receiptData, taxAmount: val})} 
              />
            </View>

            <View style={styles.totalDisplay}>
              <Text style={styles.totalLabel}>支払合計 (税込)</Text>
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
                  <Text style={styles.subLabel}>単価 (¥)</Text>
                  <TextInput 
                    style={styles.inputSmall} 
                    value={String(item.price)} 
                    keyboardType="decimal-pad" 
                    onChangeText={(val) => updateItem(idx, 'price', val)} 
                  />
                </View>
                <View style={[styles.itemSubGroup, { flex: 0.6 }]}>
                  <Text style={styles.subLabel}>数量</Text>
                  <TextInput 
                    style={styles.inputSmall} 
                    value={String(item.quantity)} 
                    keyboardType="decimal-pad" 
                    onChangeText={(val) => updateItem(idx, 'quantity', val)} 
                  />
                </View>
                <View style={[styles.itemSubGroup, { alignItems: 'flex-end' }]}>
                  <Text style={styles.subLabel}>小計</Text>
                  <Text style={styles.subTotalText}>
                    ¥ {Math.round((parseFloat(String(item.price)) || 0) * (parseFloat(String(item.quantity)) || 0)).toLocaleString()}
                  </Text>
                </View>
              </View>

              <View style={styles.categoryRow}>
                <Text style={styles.subLabel}>カテゴリ</Text>
                <View style={styles.pickerWrapper}>
                  <Picker
                    selectedValue={item.categoryId}
                    onValueChange={(val) => updateItem(idx, 'categoryId', val)}
                    style={styles.picker}
                    mode="dropdown"
                  >
                    <Picker.Item label="未選択" value={null} color={theme.colors.semantic.picker.muted} />
                    {categories.map(c => (
                      <Picker.Item key={c.id} label={c.name} value={c.id} color={theme.colors.semantic.picker.text} />
                    ))}
                  </Picker>
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
  container: { flex: 1, backgroundColor: s.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.md,
    backgroundColor: c.surface,
    borderBottomWidth: 1,
    borderBottomColor: s.borderLight,
  },
  headerTitle: { fontSize: 17, fontWeight: 'bold', color: s.textTitle },
  cancelText: { color: s.textSecondary, fontSize: 15 },
  saveButton: { backgroundColor: c.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: theme.borderRadius.lg },
  saveButtonText: { color: c.text.inverse, fontWeight: 'bold' },
  scrollView: { flex: 1 },
  imageContainer: { width: '100%', height: 260, backgroundColor: s.imageBg, marginBottom: theme.spacing.md, position: 'relative' },
  receiptImage: { width: '100%', height: '100%' },
  imageLabel: { position: 'absolute', bottom: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: theme.borderRadius.sm },
  imageLabelText: { color: c.text.inverse, fontSize: 10, fontWeight: 'bold' },
  card: { backgroundColor: c.surface, margin: theme.spacing.md, marginTop: 0, borderRadius: theme.spacing.md, padding: theme.spacing.md, elevation: 2 },
  sectionLabel: { fontSize: 12, fontWeight: 'bold', color: s.textMuted, textTransform: 'uppercase', marginBottom: 12 },
  input: { borderBottomWidth: 1, borderBottomColor: s.borderInput, paddingVertical: 8, fontSize: 16, color: s.textBody, marginBottom: 12 },
  taxInputRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingVertical: 4 },
  taxLabel: { fontSize: 14, color: s.textSub },
  taxInput: { borderBottomWidth: 1, borderBottomColor: c.primary, fontSize: 16, color: c.primary, fontWeight: 'bold', minWidth: 80, textAlign: 'right' },
  totalDisplay: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingTop: theme.spacing.md, borderTopWidth: 1, borderTopColor: s.borderInput },
  totalLabel: { fontSize: 14, color: s.textSecondary },
  totalValue: { fontSize: 24, fontWeight: 'bold', color: c.primary },
  itemsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: theme.spacing.md, marginBottom: 12 },
  addButton: { backgroundColor: s.primaryLight, paddingHorizontal: 12, paddingVertical: 6, borderRadius: theme.borderRadius.sm },
  addButtonText: { color: c.primary, fontWeight: 'bold', fontSize: 13 },
  itemCard: { backgroundColor: c.surface, marginHorizontal: theme.spacing.md, marginBottom: 12, borderRadius: theme.spacing.md, padding: theme.spacing.md, borderLeftWidth: 4, borderLeftColor: c.primary, elevation: 1 },
  itemHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  itemNameInput: { flex: 1, fontSize: 15, fontWeight: 'bold', color: s.textBody },
  deleteIcon: { fontSize: 18, color: s.deleteIcon },
  itemDetailRow: { flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: 12 },
  itemSubGroup: { flex: 1 },
  subLabel: { fontSize: 10, color: s.textMuted, fontWeight: 'bold', marginBottom: 4 },
  inputSmall: { borderBottomWidth: 1, borderBottomColor: s.borderInput, paddingVertical: 4, fontSize: 14, color: s.textItem, fontWeight: '600' },
  subTotalText: { fontSize: 14, fontWeight: '700', color: s.textItem, paddingTop: 4 },
  categoryRow: { borderTopWidth: 1, borderTopColor: s.background, paddingTop: theme.spacing.sm },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: s.borderInput,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: s.pickerBg,
    height: 55,
    justifyContent: 'center',
    marginTop: 4,
    overflow: 'visible',
  },
  picker: {
    width: '100%',
    height: 55,
    color: theme.colors.semantic.picker.text,
    ...Platform.select({
      android: {
        marginLeft: -10,
      },
    }),
  },
  headerButton: { padding: 4 },
});