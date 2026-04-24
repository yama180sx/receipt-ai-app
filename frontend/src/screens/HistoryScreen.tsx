import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, ActivityIndicator, Image, ScrollView, Modal, Platform, Alert, useWindowDimensions } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import apiClient from '../utils/apiClient';
import { theme } from '../theme';

interface HistoryScreenProps {
  onBack: () => void;
  currentMemberId: number; 
}

export default function HistoryScreen({ onBack, currentMemberId }: HistoryScreenProps) {
  const { width: windowWidth } = useWindowDimensions();
  const isWide = windowWidth > 800; 

  const [loading, setLoading] = useState(true);
  const [receipts, setReceipts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedReceipt, setSelectedReceipt] = useState<any | null>(null);
  
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedMember, setSelectedMember] = useState(currentMemberId.toString());

  const cacheKey = useMemo(() => Date.now(), []);

  const months = useMemo(() => {
    return Array.from({ length: 6 }).map((_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      return d.toISOString().slice(0, 7);
    });
  }, []);

  const API_URL = process.env.EXPO_PUBLIC_API_URL || '';
  const BASE_URL = API_URL.replace(/\/api\/?$/, '');

  const fetchCategories = useCallback(async () => {
    try {
      const res = await apiClient.get('/categories', {
        headers: { 'x-member-id': selectedMember }
      });
      if (res.data && res.data.success) {
        setCategories(res.data.data);
      }
    } catch (err) {
      console.error('カテゴリー取得失敗', err);
    }
  }, [selectedMember]);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  const fetchReceipts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/receipts', {
        params: { memberId: selectedMember, month: selectedMonth },
        headers: { 'x-member-id': selectedMember }
      });
      if (res.data && res.data.success) {
        setReceipts(res.data.data);
        if (isWide && res.data.data.length > 0 && !selectedReceipt) {
          setSelectedReceipt(res.data.data[0]);
        }
      }
    } catch (err) {
      console.error('履歴取得失敗', err);
      Alert.alert('エラー', '履歴の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedMember, isWide]);

  useEffect(() => { fetchReceipts(); }, [fetchReceipts]);

  const handleCategoryChange = async (itemId: number, categoryId: number | null) => {
    if (!categoryId) return;
    try {
      const response = await apiClient.patch(`/receipt-items/${itemId}`, 
        { categoryId: Number(categoryId) },
        { headers: { 'x-member-id': selectedMember } }
      );
      
      if (response.data && response.data.success) {
        const updatedItem = response.data.data;
        const updateInList = (prev: any[]) => prev.map(r => ({
          ...r,
          items: r.items.map((item: any) =>
            item.id === itemId ? { ...item, categoryId: updatedItem.categoryId, category: updatedItem.category } : item
          ),
        }));

        setReceipts(updateInList);
        if (selectedReceipt) {
          setSelectedReceipt((prev: any) => ({
            ...prev,
            items: prev.items.map((item: any) =>
              item.id === itemId ? { ...item, categoryId: updatedItem.categoryId, category: updatedItem.category } : item
            ),
          }));
        }
      }
    } catch (err) {
      console.error('カテゴリー更新失敗', err);
      Alert.alert('エラー', '更新に失敗しました');
    }
  };

  const getImageUrl = useCallback((imagePath: string) => {
    if (!imagePath) return null;
    return `${BASE_URL}/${imagePath}?v=${cacheKey}`;
  }, [BASE_URL, cacheKey]);

  const ReceiptDetailView = ({ receipt }: { receipt: any }) => {
    if (!receipt) {
      return (
        <View style={styles.placeholderContainer}>
          <Text style={styles.emptyText}>レシートを選択してください</Text>
        </View>
      );
    }

    return (
      <ScrollView style={styles.detailScroll} showsVerticalScrollIndicator={false}>
        <View style={styles.detailHeaderInner}>
          <Text style={styles.detailTitle} numberOfLines={2}>{receipt.storeName || '店名不明'}</Text>
          <Text style={styles.detailDate}>
            {receipt.date ? new Date(receipt.date).toLocaleDateString('ja-JP') : '日付不明'}
          </Text>
        </View>

        {receipt.imagePath && (
          <View style={styles.imageWrapper}>
            <Image 
              source={{ uri: getImageUrl(receipt.imagePath) as string }}
              style={styles.receiptImage}
              resizeMode="contain"
            />
          </View>
        )}

        <View style={styles.detailTotalContainer}>
          <Text style={styles.detailTotalLabel}>合計金額（税込）</Text>
          <Text style={styles.detailTotalValue}>¥{(receipt.totalAmount || 0).toLocaleString()}</Text>
        </View>

        <View style={styles.itemsSection}>
          <Text style={styles.itemsSectionTitle}>明細・カテゴリ設定</Text>
          {receipt.items?.map((item: any) => (
            <View key={item.id} style={styles.detailItemRow}>
              {/* 情報を縦に積むスタイルに変更し、衝突を回避 */}
              <View style={styles.detailItemTop}>
                <Text style={styles.detailItemName}>{item.name}</Text>
                <View style={styles.detailPriceContainer}>
                  <Text style={styles.detailItemPrice}>
                    ¥{((item.price || 0) * (item.quantity || 1)).toLocaleString()}
                  </Text>
                  <Text style={styles.detailItemSub}>
                    （¥{(item.price || 0).toLocaleString()} × {item.quantity || 1}）
                  </Text>
                </View>
              </View>
              <View style={styles.detailItemBottom}>
                <View style={styles.detailPickerWrapper}>
                  <Picker
                    selectedValue={item.categoryId}
                    onValueChange={(val) => handleCategoryChange(item.id, val)}
                    style={styles.detailPicker}
                  >
                    <Picker.Item label="カテゴリーを選択..." value={null} color={theme.colors.text.muted} />
                    {categories.map(c => <Picker.Item key={c.id} label={c.name} value={c.id} />)}
                  </Picker>
                </View>
              </View>
            </View>
          ))}
        </View>
        <View style={{ height: 50 }} />
      </ScrollView>
    );
  };

  const renderItem = ({ item }: { item: any }) => {
    const isSelected = selectedReceipt?.id === item.id;
    return (
      <TouchableOpacity 
        style={[styles.card, isSelected && isWide && styles.activeCard]} 
        onPress={() => setSelectedReceipt(item)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.date}>{item.date ? new Date(item.date).toLocaleDateString('ja-JP') : '日付不明'}</Text>
          <Text style={[styles.store, isSelected && isWide && { color: theme.colors.primary }]} numberOfLines={1}>
            {item.storeName || '店名不明'}
          </Text>
        </View>
        <View style={styles.cardBody}>
          <View>
            <Text style={styles.amount}>¥{(item.totalAmount || 0).toLocaleString()}</Text>
          </View>
          <View style={styles.itemCountBadge}>
            <Text style={styles.itemCountText}>{(item.items?.length || 0)} 点</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
          <Text style={styles.backButton}>← 戻る</Text>
        </TouchableOpacity>
        <Text style={styles.title}>レシート履歴</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={[styles.filterContainer, isWide && styles.wideFilter]}>
        <View style={[styles.pickerBox, isWide && { maxWidth: 250 }]}>
          <Picker selectedValue={selectedMonth} onValueChange={setSelectedMonth} style={styles.filterPicker}>
            <Picker.Item label="全期間" value="" />
            {months.map(m => (
              <Picker.Item key={m} label={`${m.split('-')[0]}年${m.split('-')[1]}月`} value={m} />
            ))}
          </Picker>
        </View>
        <View style={[styles.pickerBox, isWide && { maxWidth: 200 }]}>
          <Picker selectedValue={selectedMember} onValueChange={setSelectedMember} style={styles.filterPicker}>
            <Picker.Item label="自分" value="1" />
            <Picker.Item label="その他" value="2" />
          </Picker>
        </View>
      </View>

      <View style={isWide ? styles.mainContentWide : styles.mainContentMobile}>
        <View style={isWide ? styles.masterPane : styles.fullPane}>
          {loading ? (
            <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 50 }} />
          ) : (
            <FlatList
              data={receipts}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderItem}
              contentContainerStyle={styles.list}
              ListEmptyComponent={<Text style={styles.empty}>該当する履歴がありません</Text>}
              initialNumToRender={15}
            />
          )}
        </View>

        {isWide && (
          <View style={styles.detailPane}>
            <ReceiptDetailView receipt={selectedReceipt} />
          </View>
        )}
      </View>

      {!isWide && (
        <Modal visible={!!selectedReceipt} animationType="slide" onRequestClose={() => setSelectedReceipt(null)}>
          <View style={styles.modalContent}>
            <View style={styles.detailHeader}>
              <Text style={styles.detailTitleMobile} numberOfLines={1}>{selectedReceipt?.storeName || '店名不明'}</Text>
              <TouchableOpacity onPress={() => setSelectedReceipt(null)}>
                <Text style={styles.detailClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ReceiptDetailView receipt={selectedReceipt} />
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, paddingTop: Platform.OS === 'ios' ? 60 : 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: theme.spacing.lg, marginBottom: theme.spacing.md },
  backButton: { color: theme.colors.primary, fontWeight: '700' },
  title: { ...theme.typography.h2, color: theme.colors.text.main },
  filterContainer: { flexDirection: 'row', paddingHorizontal: theme.spacing.md, marginBottom: theme.spacing.md, justifyContent: 'space-between' },
  wideFilter: { justifyContent: 'flex-start', gap: 10 },
  pickerBox: { flex: 1, height: 44, backgroundColor: theme.colors.surface, borderRadius: 8, justifyContent: 'center', borderWidth: 1, borderColor: theme.colors.border },
  filterPicker: { width: '100%' },

  mainContentMobile: { flex: 1 },
  mainContentWide: { flex: 1, flexDirection: 'row', borderTopWidth: 1, borderTopColor: theme.colors.border },
  masterPane: { width: 380, backgroundColor: theme.colors.surface, borderRightWidth: 1, borderRightColor: theme.colors.border },
  fullPane: { flex: 1 },
  detailPane: { flex: 1, backgroundColor: theme.colors.background },

  list: { padding: theme.spacing.md },
  card: { backgroundColor: theme.colors.surface, borderRadius: 12, padding: 15, marginBottom: 10, borderWidth: 1, borderColor: theme.colors.border },
  activeCard: { borderColor: theme.colors.primary, backgroundColor: '#F0F7FF', elevation: 0, shadowOpacity: 0 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  date: { fontSize: 12, color: theme.colors.text.muted },
  store: { fontWeight: '700', color: theme.colors.text.main, flex: 1, marginLeft: 10, textAlign: 'right' },
  cardBody: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  amount: { fontSize: 18, fontWeight: 'bold', color: theme.colors.primary },
  itemCountBadge: { backgroundColor: theme.colors.background, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  itemCountText: { fontSize: 10, color: theme.colors.secondary },
  empty: { textAlign: 'center', marginTop: 50, color: theme.colors.text.muted },

  placeholderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: theme.colors.text.muted },
  detailScroll: { flex: 1, padding: 20 },
  detailHeaderInner: { marginBottom: 20 },
  detailTitle: { fontSize: 24, fontWeight: 'bold', color: theme.colors.text.main },
  detailDate: { fontSize: 14, color: theme.colors.text.muted, marginTop: 4 },
  imageWrapper: { width: '100%', height: 400, backgroundColor: theme.colors.surface, borderRadius: 12, marginBottom: 20, borderWidth: 1, borderColor: theme.colors.border },
  receiptImage: { width: '100%', height: '100%' },
  detailTotalContainer: { alignItems: 'flex-end', marginBottom: 30, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  detailTotalLabel: { fontSize: 12, color: theme.colors.text.muted },
  detailTotalValue: { fontSize: 32, fontWeight: 'bold', color: theme.colors.text.main },
  
  itemsSection: { marginBottom: 20 },
  itemsSectionTitle: { fontSize: 12, fontWeight: '700', color: theme.colors.secondary, marginBottom: 10, textTransform: 'uppercase' },
  
  // --- ★ レイアウトを「縦積み」に変更：衝突を物理的に排除 ---
  detailItemRow: { 
    flexDirection: 'column', // 横並びをやめて縦並びにする
    justifyContent: 'flex-start', 
    alignItems: 'stretch', 
    paddingVertical: 15, 
    borderBottomWidth: 1, 
    borderBottomColor: '#F0F0F0' 
  },
  detailItemTop: { 
    marginBottom: 8, // Pickerとの間に余白を作る
  },
  detailItemBottom: { 
    width: '100%',
  },
  detailItemName: { 
    fontSize: 16, 
    fontWeight: '600',
    color: theme.colors.text.main,
    marginBottom: 4,
  },
  detailPriceContainer: { 
    flexDirection: 'row', 
    alignItems: 'baseline',
  },
  detailItemPrice: { 
    fontSize: 14,
    fontWeight: '700', 
    color: theme.colors.primary 
  },
  detailItemSub: { 
    fontSize: 11, 
    color: theme.colors.text.muted, 
    marginLeft: 4 
  },
  detailPickerWrapper: { 
    height: 44, // 少し高さを出して押しやすく
    backgroundColor: theme.colors.surface, 
    borderRadius: 8, 
    borderWidth: 1, 
    borderColor: theme.colors.border, 
    overflow: 'hidden',
    justifyContent: 'center'
  },
  detailPicker: { 
    width: '100%',
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      } as any
    })
  },

  modalContent: { flex: 1, backgroundColor: theme.colors.background },
  detailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  detailTitleMobile: { fontSize: 18, fontWeight: 'bold', flex: 1 },
  detailClose: { fontSize: 24, color: theme.colors.text.muted, marginLeft: 15 }
});