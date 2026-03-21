import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, ActivityIndicator, Image, ScrollView, Modal } from 'react-native';
import { Picker } from '@react-native-picker/picker';

export default function HistoryScreen({ onBack, API_BASE }: { onBack: () => void, API_BASE: string }) {
  const [loading, setLoading] = useState(true);
  const [receipts, setReceipts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedReceipt, setSelectedReceipt] = useState<any | null>(null);
  
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedMember, setSelectedMember] = useState('1');

  // 無限ループ防止：キャッシュ破棄用のキーをコンポーネントマウント時に一度だけ生成
  const cacheKey = useMemo(() => Date.now(), []);

  const months = ['2026-03', '2026-02', '2026-01', '2025-12'];

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

  const handleCategoryChange = async (itemId: number, categoryId: number | null) => {
    if (!categoryId) return;
    try {
      const response = await fetch(`${API_BASE}/receipt-items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryId: Number(categoryId) }),
      });
      const updatedItem = await response.json();

      setSelectedReceipt((prev: any) =>
        prev ? {
          ...prev,
          items: prev.items.map((item: any) =>
            item.id === itemId ? { ...item, categoryId: updatedItem.categoryId, category: updatedItem.category } : item
          ),
        } : prev
      );

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
    // Date.now() ではなく固定された cacheKey を使用（ループ防止）
    return `${baseUrl}/${imagePath}?v=${cacheKey}`;
  }, [API_BASE, cacheKey]);

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.card} onPress={() => setSelectedReceipt(item)}>
      <View style={styles.cardHeader}>
        <Text style={styles.date}>{new Date(item.date).toLocaleDateString('ja-JP')}</Text>
        <Text style={styles.store}>{item.storeName}</Text>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.amount}>¥{item.totalAmount.toLocaleString()}</Text>
        <Text style={styles.itemCount}>{item.items.length} 点</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* ヘッダーエリア */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
          <Text style={styles.backButton}>← 戻る</Text>
        </TouchableOpacity>
        <Text style={styles.title}>レシート履歴</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* フィルタエリア */}
      <View style={styles.filterContainer}>
        <View style={styles.pickerBox}><Picker selectedValue={selectedMonth} onValueChange={setSelectedMonth} style={styles.filterPicker}><Picker.Item label="全期間" value="" />{months.map(m => <Picker.Item key={m} label={m} value={m} />)}</Picker></View>
        <View style={styles.pickerBox}><Picker selectedValue={selectedMember} onValueChange={setSelectedMember} style={styles.filterPicker}><Picker.Item label="メンバー1" value="1" /><Picker.Item label="メンバー2" value="2" /></Picker></View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 50 }} />
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

      {/* 詳細モーダル（Issue #23 対策: Modalコンポーネントに変更） */}
      <Modal
        visible={!!selectedReceipt}
        animationType="slide"
        onRequestClose={() => setSelectedReceipt(null)}
      >
        <View style={styles.modalContent}>
          <View style={styles.detailHeader}>
            <Text style={styles.detailTitle}>{selectedReceipt?.storeName}</Text>
            <TouchableOpacity onPress={() => setSelectedReceipt(null)} hitSlop={{top: 20, bottom: 20, left: 20, right: 20}}>
              <Text style={styles.detailClose}>✕ 閉じる</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.detailScroll}>
            {selectedReceipt?.imagePath && (
              <View style={styles.imageWrapper}>
                <Image 
                  source={{ uri: getImageUrl(selectedReceipt.imagePath) as string }}
                  style={styles.receiptImage}
                  resizeMode="contain"
                  resizeMethod="resize"
                />
              </View>
            )}

            <Text style={styles.detailTotal}>合計: ¥{selectedReceipt?.totalAmount.toLocaleString()}</Text>

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
                    <Picker.Item label="未分類" value={null} color="#999" />
                    {categories.map(c => <Picker.Item key={c.id} label={c.name} value={c.id} />)}
                  </Picker>
                </View>
              </View>
            ))}
            <View style={{ height: 100 }} />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2f5', paddingTop: 60 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 15 },
  backButton: { color: '#007AFF', fontSize: 18, fontWeight: 'bold', paddingVertical: 5 },
  title: { fontSize: 20, fontWeight: 'bold' },
  filterContainer: { flexDirection: 'row', paddingHorizontal: 15, marginBottom: 15, justifyContent: 'space-between' },
  pickerBox: { flex: 1, height: 45, backgroundColor: 'white', borderRadius: 8, marginHorizontal: 5, justifyContent: 'center', overflow: 'hidden', elevation: 1 },
  filterPicker: { width: '100%' },
  list: { paddingHorizontal: 15, paddingBottom: 30 },
  card: { backgroundColor: 'white', borderRadius: 12, padding: 15, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  date: { color: '#888', fontSize: 13 },
  store: { fontSize: 15, fontWeight: 'bold', color: '#333' },
  cardBody: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  amount: { fontSize: 20, fontWeight: 'bold', color: '#007AFF' },
  itemCount: { color: '#666', fontSize: 12 },
  empty: { textAlign: 'center', marginTop: 50, color: '#999' },
  
  // モーダル関連
  modalContent: { flex: 1, backgroundColor: 'white', paddingTop: 50, paddingHorizontal: 20 },
  detailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
  detailTitle: { fontSize: 18, fontWeight: 'bold', flex: 1 },
  detailClose: { fontSize: 16, color: '#FF3B30', fontWeight: 'bold' },
  detailScroll: { flex: 1 },
  imageWrapper: { width: '100%', height: 350, backgroundColor: '#f8f8f8', borderRadius: 12, marginBottom: 20 },
  receiptImage: { width: '100%', height: '100%' },
  detailTotal: { fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 25, textAlign: 'right' },
  detailItemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  detailItemInfo: { flex: 1 },
  detailItemName: { fontSize: 14, color: '#333' },
  detailItemPrice: { fontSize: 16, fontWeight: 'bold', color: '#007AFF' },
  detailPickerWrapper: { width: 130, height: 40, backgroundColor: '#f0f0f0', borderRadius: 8, overflow: 'hidden' },
  detailPicker: { width: '100%' },
});