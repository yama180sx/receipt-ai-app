import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, ActivityIndicator, Image, ScrollView, Modal, Platform } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { theme } from '../theme';

export default function HistoryScreen({ onBack, API_BASE }: { onBack: () => void, API_BASE: string }) {
  const [loading, setLoading] = useState(true);
  const [receipts, setReceipts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedReceipt, setSelectedReceipt] = useState<any | null>(null);
  
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedMember, setSelectedMember] = useState('1');

  // 無限ループ防止用のキー
  const cacheKey = useMemo(() => Date.now(), []);
  const months = ['2026-03', '2026-02', '2026-01', '2025-12'];

  // カテゴリーマスタ取得
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch(`${API_BASE}/categories`);
        const data = await res.json();
        setCategories(data);
      } catch (err) {
        console.error('カテゴリー取得失敗', err);
      }
    };
    fetchCategories();
  }, [API_BASE]);

  // レシート一覧取得
  useEffect(() => {
    fetchReceipts();
  }, [selectedMonth, selectedMember]);

  const fetchReceipts = async () => {
    try {
      setLoading(true);
      const url = `${API_BASE}/receipts?memberId=${selectedMember}&month=${selectedMonth}`;
      const res = await fetch(url);
      const data = await res.json();
      setReceipts(data);
    } catch (err) {
      console.error('履歴取得失敗', err);
    } finally {
      setLoading(false);
    }
  };

  // 明細のカテゴリー更新
  const handleCategoryChange = async (itemId: number, categoryId: number | null) => {
    if (!categoryId) return;
    try {
      const response = await fetch(`${API_BASE}/receipt-items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryId: Number(categoryId) }),
      });
      const updatedItem = await response.json();

      // 詳細モーダルのステート更新
      setSelectedReceipt((prev: any) =>
        prev ? {
          ...prev,
          items: prev.items.map((item: any) =>
            item.id === itemId ? { ...item, categoryId: updatedItem.categoryId, category: updatedItem.category } : item
          ),
        } : prev
      );

      // 一覧側のステート更新
      setReceipts(prev => prev.map(r => ({
        ...r,
        items: r.items.map((item: any) =>
          item.id === itemId ? { ...item, categoryId: updatedItem.categoryId, category: updatedItem.category } : item
        ),
      })));
    } catch (err) {
      console.error('カテゴリー更新失敗', err);
    }
  };

  const getImageUrl = useCallback((imagePath: string) => {
    if (!imagePath) return null;
    const baseUrl = API_BASE.replace('/api', '');
    return `${baseUrl}/${imagePath}?v=${cacheKey}`;
  }, [API_BASE, cacheKey]);

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={styles.card} 
      onPress={() => setSelectedReceipt(item)}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.date}>{new Date(item.date).toLocaleDateString('ja-JP')}</Text>
        <Text style={styles.store} numberOfLines={1}>{item.storeName}</Text>
      </View>
      <View style={styles.cardBody}>
        <View>
          <Text style={styles.label}>合計</Text>
          <Text style={styles.amount}>¥{item.totalAmount.toLocaleString()}</Text>
        </View>
        <View style={styles.itemCountBadge}>
          <Text style={styles.itemCountText}>{item.items.length} 点</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
          <Text style={styles.backButton}>← 戻る</Text>
        </TouchableOpacity>
        <Text style={styles.title}>レシート履歴</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.filterContainer}>
        <View style={styles.pickerBox}>
          <Picker 
            selectedValue={selectedMonth} 
            onValueChange={setSelectedMonth} 
            style={styles.filterPicker}
            dropdownIconColor={theme.colors.primary}
          >
            <Picker.Item label="全期間" value="" />
            {months.map(m => <Picker.Item key={m} label={m} value={m} />)}
          </Picker>
        </View>
        <View style={styles.pickerBox}>
          <Picker 
            selectedValue={selectedMember} 
            onValueChange={setSelectedMember} 
            style={styles.filterPicker}
            dropdownIconColor={theme.colors.primary}
          >
            <Picker.Item label="メンバー1" value="1" />
            <Picker.Item label="メンバー2" value="2" />
          </Picker>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={receipts}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>該当する履歴がありません</Text>}
          initialNumToRender={10}
          removeClippedSubviews={true}
        />
      )}

      <Modal
        visible={!!selectedReceipt}
        animationType="slide"
        onRequestClose={() => setSelectedReceipt(null)}
      >
        <View style={styles.modalContent}>
          <View style={styles.detailHeader}>
            <Text style={styles.detailTitle} numberOfLines={1}>{selectedReceipt?.storeName}</Text>
            <TouchableOpacity onPress={() => setSelectedReceipt(null)} hitSlop={{top: 20, bottom: 20, left: 20, right: 20}}>
              <Text style={styles.detailClose}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.detailScroll} showsVerticalScrollIndicator={false}>
            {selectedReceipt?.imagePath && (
              <View style={styles.imageWrapper}>
                <Image 
                  source={{ uri: getImageUrl(selectedReceipt.imagePath) as string }}
                  style={styles.receiptImage}
                  resizeMode="contain"
                />
              </View>
            )}

            <View style={styles.detailTotalContainer}>
              <Text style={styles.detailTotalLabel}>合計金額（税込）</Text>
              <Text style={styles.detailTotalValue}>¥{selectedReceipt?.totalAmount.toLocaleString()}</Text>
            </View>

            <View style={styles.itemsSection}>
              <Text style={styles.itemsSectionTitle}>明細・カテゴリ設定</Text>
              {selectedReceipt?.items.map((item: any) => (
                <View key={item.id} style={styles.detailItemRow}>
                  <View style={styles.detailItemInfo}>
                    <Text style={styles.detailItemName}>{item.name}</Text>
                    <Text style={styles.detailItemPrice}>¥{item.price.toLocaleString()}</Text>
                  </View>
                  <View style={styles.detailPickerWrapper}>
                    <Picker
                      selectedValue={item.categoryId}
                      onValueChange={(val) => handleCategoryChange(item.id, val)}
                      style={styles.detailPicker}
                    >
                      <Picker.Item label="未分類" value={null} color={theme.colors.text.muted} />
                      {categories.map(c => <Picker.Item key={c.id} label={c.name} value={c.id} />)}
                    </Picker>
                  </View>
                </View>
              ))}
            </View>
            <View style={{ height: 100 }} />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: theme.colors.background, 
    paddingTop: Platform.OS === 'ios' ? 60 : 20 
  },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: theme.spacing.lg, 
    marginBottom: theme.spacing.md 
  },
  backButton: { 
    ...theme.typography.body,
    color: theme.colors.primary, 
    fontWeight: '700' 
  },
  title: { 
    ...theme.typography.h2,
    color: theme.colors.text.main 
  },
  filterContainer: { 
    flexDirection: 'row', 
    paddingHorizontal: theme.spacing.md, 
    marginBottom: theme.spacing.md, 
    justifyContent: 'space-between' 
  },
  pickerBox: { 
    flex: 1, 
    height: 48, 
    backgroundColor: theme.colors.surface, 
    borderRadius: theme.borderRadius.sm, 
    marginHorizontal: theme.spacing.xs, 
    justifyContent: 'center', 
    borderWidth: 1,
    borderColor: theme.colors.border,
    elevation: 1 
  },
  filterPicker: { width: '100%' },
  list: { paddingHorizontal: theme.spacing.md, paddingBottom: theme.spacing.xl },
  card: { 
    backgroundColor: theme.colors.surface, 
    borderRadius: theme.borderRadius.md, 
    padding: theme.spacing.md, 
    marginBottom: theme.spacing.sm, 
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 },
      android: { elevation: 2 }
    })
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: theme.spacing.sm },
  date: { ...theme.typography.caption, color: theme.colors.text.muted },
  store: { ...theme.typography.body, fontWeight: '700', color: theme.colors.text.main, flex: 1, marginLeft: theme.spacing.sm, textAlign: 'right' },
  cardBody: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  label: { ...theme.typography.caption, color: theme.colors.text.muted },
  amount: { ...theme.typography.h2, color: theme.colors.primary },
  itemCountBadge: { backgroundColor: theme.colors.background, paddingHorizontal: theme.spacing.sm, paddingVertical: 2, borderRadius: theme.borderRadius.round },
  itemCountText: { ...theme.typography.caption, color: theme.colors.secondary },
  empty: { textAlign: 'center', marginTop: 50, color: theme.colors.text.muted },
  
  modalContent: { flex: 1, backgroundColor: theme.colors.background, paddingTop: Platform.OS === 'ios' ? 50 : 20, paddingHorizontal: theme.spacing.lg },
  detailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.lg, paddingBottom: theme.spacing.sm, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  detailTitle: { ...theme.typography.h2, flex: 1, color: theme.colors.text.main },
  detailClose: { fontSize: 24, color: theme.colors.secondary, fontWeight: '300' },
  detailScroll: { flex: 1 },
  imageWrapper: { width: '100%', height: 300, backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.md, marginBottom: theme.spacing.lg, overflow: 'hidden', borderWidth: 1, borderColor: theme.colors.border },
  receiptImage: { width: '100%', height: '100%' },
  detailTotalContainer: { alignItems: 'flex-end', marginBottom: theme.spacing.xl },
  detailTotalLabel: { ...theme.typography.caption, color: theme.colors.text.muted },
  detailTotalValue: { ...theme.typography.h1, color: theme.colors.text.main },
  itemsSection: { marginBottom: theme.spacing.md },
  itemsSectionTitle: { ...theme.typography.caption, fontWeight: '700', color: theme.colors.secondary, marginBottom: theme.spacing.sm, textTransform: 'uppercase' },
  detailItemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: theme.spacing.md, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  detailItemInfo: { flex: 1 },
  detailItemName: { ...theme.typography.body, fontSize: 14, color: theme.colors.text.main },
  detailItemPrice: { ...theme.typography.body, fontWeight: '700', color: theme.colors.primary, marginTop: 2 },
  detailPickerWrapper: { width: 140, height: 40, backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.sm, borderWidth: 1, borderColor: theme.colors.border, overflow: 'hidden' },
  detailPicker: { width: '100%' },
});