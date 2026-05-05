import React, { useState, useEffect, useMemo } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  Image, 
  ScrollView, 
  useWindowDimensions, 
  Platform, 
  TextInput, 
  TouchableOpacity, 
  ActivityIndicator, 
  Alert 
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { theme, BREAKPOINTS } from '../theme';
import apiClient from '../utils/apiClient';

interface ReceiptDetailComponentProps {
  receipt: any;
  categories: any[];
  onCategoryChange: (itemId: number, categoryId: number | null) => void;
  baseUrl: string;
  fullWidth?: boolean; 
  onSaveSuccess?: () => void; // 保存成功時のリロード用
}

/**
 * [Issue #67] レシート詳細表示・編集コンポーネント
 * - 編集モードの追加 (店舗名、日付、明細名、単価、数量)
 * - 小数点入力対応の数値処理
 * - 保存時の一括更新処理
 */
export const ReceiptDetailComponent: React.FC<ReceiptDetailComponentProps> = ({
  receipt,
  categories,
  onCategoryChange,
  baseUrl,
  fullWidth = true,
  onSaveSuccess
}) => {
  const { width: windowWidth } = useWindowDimensions();
  const effectiveWidth = fullWidth ? windowWidth : windowWidth - 350;
  const isWide = effectiveWidth >= BREAKPOINTS.TABLET;

  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editData, setEditData] = useState<any>(null);

  const cacheKey = useMemo(() => Date.now(), []);

  // 選択されたレシートが変わったとき、または編集モード開始時にデータを同期
  useEffect(() => {
    if (receipt) {
      setEditData(JSON.parse(JSON.stringify(receipt))); // ディープコピー
    }
    setIsEditing(false);
  }, [receipt]);

  // 表示用の合計金額計算 (リアルタイム反映)
  const displayTotal = useMemo(() => {
    if (!editData) return 0;
    const items = isEditing ? editData.items : receipt.items;
    const sum = items.reduce((s: number, i: any) => {
      const p = parseFloat(String(i.price)) || 0;
      const q = parseFloat(String(i.quantity)) || 0;
      return s + (p * q);
    }, 0);
    return Math.round(sum); // 日本円の整合性のため四捨五入
  }, [isEditing, editData?.items, receipt.items]);

  if (!receipt || !editData) {
    return (
      <View style={styles.placeholderContainer}>
        <Text style={styles.emptyText}>レシートを選択してください</Text>
      </View>
    );
  }

  const getImageUrl = (imagePath: string) => {
    if (!imagePath) return null;
    return `${baseUrl}/${imagePath}?v=${cacheKey}`;
  };

  // 編集内容の更新ロジック
  const updateEditField = (key: string, value: any) => {
    setEditData({ ...editData, [key]: value });
  };

  const updateEditItem = (index: number, key: string, value: any) => {
    const newItems = [...editData.items];
    newItems[index] = { ...newItems[index], [key]: value };
    setEditData({ ...editData, items: newItems });
  };

  // 保存処理 (Issue #67: 小数対応)
  const handleSave = async () => {
    setLoading(true);
    try {
      const payload = {
        storeName: editData.storeName,
        date: editData.date,
        items: editData.items.map((item: any) => ({
          ...item,
          price: parseFloat(String(item.price)) || 0,
          quantity: parseFloat(String(item.quantity)) || 0,
          categoryId: item.categoryId ? Number(item.categoryId) : null
        }))
      };

      const res = await apiClient.patch(`/receipts/${receipt.id}`, payload);
      if (res.data?.success) {
        Alert.alert('成功', '変更を保存しました。');
        setIsEditing(false);
        if (onSaveSuccess) onSaveSuccess();
      }
    } catch (err: any) {
      console.error('Update failed', err.response?.data || err.message);
      Alert.alert('エラー', '保存に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  const DetailContent = (
    <View style={isWide ? styles.wideContentWrapper : styles.mobileContentWrapper}>
      
      {/* 左側：画像エリア */}
      <View style={isWide ? styles.wideImageColumn : styles.mobileImageArea}>
        <View style={[styles.imageWrapper, !isWide && { height: 350 }]}>
          {receipt.imagePath ? (
            <Image 
              source={{ uri: getImageUrl(receipt.imagePath) as string }}
              style={styles.receiptImage}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.noImagePlaceholder}>
              <Text style={styles.emptyText}>画像なし</Text>
            </View>
          )}
        </View>
      </View>

      {/* 右側：情報エリア */}
      <View style={isWide ? styles.wideInfoColumn : styles.mobileInfoArea}>
        <View style={styles.editControls}>
          {isEditing ? (
            <>
              <TouchableOpacity onPress={() => setIsEditing(false)} style={styles.cancelButton}>
                <Text style={styles.cancelButtonText}>キャンセル</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSave} disabled={loading} style={styles.saveButton}>
                {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveButtonText}>保存</Text>}
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity onPress={() => setIsEditing(true)} style={styles.editButton}>
              <Text style={styles.editButtonText}>✎ 編集</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.detailHeaderInner}>
          {isEditing ? (
            <TextInput 
              style={styles.titleInput}
              value={editData.storeName}
              onChangeText={(val) => updateEditField('storeName', val)}
              placeholder="店舗名"
            />
          ) : (
            <Text style={styles.detailTitle} selectable={true}>{receipt.storeName || '店名不明'}</Text>
          )}
          
          {isEditing ? (
            <TextInput 
              style={styles.dateInput}
              value={editData.date ? new Date(editData.date).toISOString().split('T')[0] : ''}
              onChangeText={(val) => updateEditField('date', val)}
              placeholder="YYYY-MM-DD"
            />
          ) : (
            <Text style={styles.detailDate}>
              {receipt.date ? new Date(receipt.date).toLocaleDateString('ja-JP') : '日付不明'}
            </Text>
          )}
        </View>

        <View style={styles.detailTotalContainer}>
          <Text style={styles.detailTotalLabel}>合計金額（税込）</Text>
          <Text style={styles.detailTotalValue}>
            ¥{displayTotal.toLocaleString()}
          </Text>
        </View>

        <View style={styles.itemsSection}>
          <Text style={styles.itemsSectionTitle}>明細・カテゴリ設定</Text>
          {(isEditing ? editData.items : receipt.items)?.map((item: any, idx: number) => (
            <View key={item.id || idx} style={styles.detailItemRow}>
              <View style={styles.detailItemTop}>
                {isEditing ? (
                  <TextInput 
                    style={styles.itemNameInput}
                    value={item.name}
                    onChangeText={(val) => updateEditItem(idx, 'name', val)}
                  />
                ) : (
                  <Text style={styles.detailItemName}>{item.name}</Text>
                )}
                
                <View style={styles.detailPriceContainer}>
                  {isEditing ? (
                    <View style={styles.editPriceRow}>
                      <Text style={styles.currencySymbol}>¥</Text>
                      <TextInput 
                        style={styles.priceInput}
                        value={String(item.price)}
                        keyboardType="decimal-pad"
                        onChangeText={(val) => updateEditItem(idx, 'price', val)}
                      />
                      <Text style={styles.multiplier}>×</Text>
                      <TextInput 
                        style={styles.quantityInput}
                        value={String(item.quantity)}
                        keyboardType="decimal-pad"
                        onChangeText={(val) => updateEditItem(idx, 'quantity', val)}
                      />
                    </View>
                  ) : (
                    <>
                      <Text style={styles.detailItemPrice}>
                        ¥{Math.round((parseFloat(String(item.price)) || 0) * (parseFloat(String(item.quantity)) || 0)).toLocaleString()}
                      </Text>
                      <Text style={styles.detailItemSub}>
                        （¥{(parseFloat(String(item.price)) || 0).toLocaleString()} × {String(parseFloat(String(item.quantity || 0)))}）
                      </Text>
                    </>
                  )}
                </View>
              </View>
              
              <View style={styles.detailItemBottom}>
                <View style={styles.detailPickerWrapper}>
                  <Picker
                    selectedValue={item.categoryId}
                    onValueChange={(val) => isEditing ? updateEditItem(idx, 'categoryId', val) : onCategoryChange(item.id, val)}
                    style={styles.detailPicker}
                    mode="dropdown"
                  >
                    <Picker.Item label="カテゴリーを選択..." value={null} color={theme.colors.text.muted} />
                    {categories.map(c => <Picker.Item key={c.id} label={c.name} value={c.id} color="#333" />)}
                  </Picker>
                </View>
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );

  return (
    <ScrollView style={styles.detailScroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
      {DetailContent}
      <View style={{ height: 50 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  detailScroll: { flex: 1 },
  placeholderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyText: { color: theme.colors.text.muted },
  wideContentWrapper: { flexDirection: 'row', padding: 30, width: '100%', alignItems: 'flex-start' },
  mobileContentWrapper: { flexDirection: 'column', padding: 20 },
  wideImageColumn: { width: 400, marginRight: 40 }, 
  wideInfoColumn: { flex: 1 }, 
  mobileImageArea: { width: '100%', marginBottom: 25 },
  mobileInfoArea: { width: '100%' },
  imageWrapper: { width: '100%', height: 600, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border, overflow: 'hidden' },
  noImagePlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.surface },
  receiptImage: { width: '100%', height: '100%' },
  detailHeaderInner: { marginBottom: 20 },
  detailTitle: { fontSize: 24, fontWeight: 'bold', color: theme.colors.text.main },
  titleInput: { fontSize: 24, fontWeight: 'bold', color: theme.colors.primary, borderBottomWidth: 1, borderBottomColor: theme.colors.primary, marginBottom: 4 },
  detailDate: { fontSize: 16, color: theme.colors.text.muted, marginTop: 4 },
  dateInput: { fontSize: 16, color: theme.colors.primary, borderBottomWidth: 1, borderBottomColor: theme.colors.primary, marginTop: 4 },
  detailTotalContainer: { alignItems: 'flex-end', marginBottom: 30, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  detailTotalLabel: { fontSize: 13, color: theme.colors.text.muted },
  detailTotalValue: { fontSize: 38, fontWeight: 'bold', color: theme.colors.text.main },
  itemsSection: { marginBottom: 20 },
  itemsSectionTitle: { fontSize: 12, fontWeight: '700', color: theme.colors.secondary, marginBottom: 15, textTransform: 'uppercase' },
  detailItemRow: { flexDirection: 'column', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  detailItemTop: { marginBottom: 10 },
  detailItemName: { fontSize: 17, fontWeight: '600', color: theme.colors.text.main, marginBottom: 4 },
  itemNameInput: { fontSize: 17, fontWeight: '600', color: theme.colors.primary, borderBottomWidth: 1, borderBottomColor: theme.colors.primary, marginBottom: 4 },
  detailPriceContainer: { flexDirection: 'row', alignItems: 'baseline' },
  detailItemPrice: { fontWeight: '700', color: theme.colors.primary, fontSize: 16 },
  detailItemSub: { fontSize: 12, color: theme.colors.text.muted, marginLeft: 6 },
  detailItemBottom: { width: '100%' },
  editControls: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 10, gap: 10 },
  editButton: { backgroundColor: theme.colors.background, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: theme.colors.border },
  editButtonText: { color: theme.colors.text.main, fontWeight: 'bold' },
  saveButton: { backgroundColor: theme.colors.primary, paddingHorizontal: 16, paddingVertical: 6, borderRadius: 8 },
  saveButtonText: { color: '#fff', fontWeight: 'bold' },
  cancelButton: { backgroundColor: '#f1f5f9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  cancelButtonText: { color: theme.colors.text.muted },
  editPriceRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  priceInput: { borderBottomWidth: 1, borderBottomColor: theme.colors.primary, width: 80, fontSize: 15, textAlign: 'right', color: theme.colors.primary },
  quantityInput: { borderBottomWidth: 1, borderBottomColor: theme.colors.primary, width: 50, fontSize: 15, textAlign: 'center', color: theme.colors.primary },
  currencySymbol: { fontSize: 14, color: theme.colors.text.muted },
  multiplier: { fontSize: 14, color: theme.colors.text.muted },
  detailPickerWrapper: { height: 55, backgroundColor: theme.colors.surface, borderRadius: 8, borderWidth: 1, borderColor: theme.colors.border, overflow: 'visible', justifyContent: 'center', marginTop: 4 },
  detailPicker: { width: '100%', height: 55, color: '#333', ...Platform.select({ android: { marginLeft: -10 }, web: { outlineStyle: 'none' } as any }) },
});