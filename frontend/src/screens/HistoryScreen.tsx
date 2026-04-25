import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, ActivityIndicator, Modal, Platform, Alert, useWindowDimensions } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import apiClient from '../utils/apiClient';
import { theme } from '../theme';
// 共通コンポーネントをインポート
import { ReceiptDetailComponent } from '../components/ReceiptDetailComponent';

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
      {/* 画面幅いっぱいに広がるためのラッパー */}
      <View style={styles.mainWrapper}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
            <Text style={styles.backButton}>← 戻る</Text>
          </TouchableOpacity>
          <Text style={styles.title}>レシート履歴</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={[styles.filterContainer, isWide && styles.wideFilter]}>
          <View style={[styles.pickerBox, isWide && { width: 250, flex: 0 }]}>
            <Picker selectedValue={selectedMonth} onValueChange={setSelectedMonth} style={styles.filterPicker}>
              <Picker.Item label="全期間" value="" />
              {months.map(m => (
                <Picker.Item key={m} label={`${m.split('-')[0]}年${m.split('-')[1]}月`} value={m} />
              ))}
            </Picker>
          </View>
          <View style={[styles.pickerBox, isWide && { width: 200, flex: 0 }]}>
            <Picker selectedValue={selectedMember} onValueChange={setSelectedMember} style={styles.filterPicker}>
              <Picker.Item label="自分" value="1" />
              <Picker.Item label="その他" value="2" />
            </Picker>
          </View>
        </View>

        <View style={isWide ? styles.mainContentWide : styles.mainContentMobile}>
          {/* 左側：リスト（幅350px固定） */}
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

          {/* 右側：詳細表示（flex: 1 で残りのスペース全てを使う） */}
          {isWide && (
            <View style={styles.detailPane}>
              <ReceiptDetailComponent 
                receipt={selectedReceipt}
                categories={categories}
                onCategoryChange={handleCategoryChange}
                baseUrl={BASE_URL}
                fullWidth={false} // リスト共有モード
              />
            </View>
          )}
        </View>
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
            <ReceiptDetailComponent 
              receipt={selectedReceipt}
              categories={categories}
              onCategoryChange={handleCategoryChange}
              baseUrl={BASE_URL}
              fullWidth={true} // モーダル全幅モード
            />
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  mainWrapper: { flex: 1, width: '100%', alignSelf: 'stretch', paddingTop: Platform.OS === 'ios' ? 60 : 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: theme.spacing.lg, marginBottom: theme.spacing.md },
  backButton: { color: theme.colors.primary, fontWeight: '700' },
  title: { ...theme.typography.h2, color: theme.colors.text.main },
  filterContainer: { flexDirection: 'row', paddingHorizontal: theme.spacing.md, marginBottom: theme.spacing.md, gap: 10 },
  wideFilter: { justifyContent: 'flex-start' },
  pickerBox: { flex: 1, height: 44, backgroundColor: theme.colors.surface, borderRadius: 8, justifyContent: 'center', borderWidth: 1, borderColor: theme.colors.border },
  filterPicker: { width: '100%' },

  mainContentMobile: { flex: 1 },
  mainContentWide: { flex: 1, flexDirection: 'row', borderTopWidth: 1, borderTopColor: theme.colors.border },
  
  masterPane: { width: 350, backgroundColor: theme.colors.surface, borderRightWidth: 1, borderRightColor: theme.colors.border },
  fullPane: { flex: 1 },
  
  // ★ デバッグ用黄色を消し、本来の背景色に修正
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

  modalContent: { flex: 1, backgroundColor: theme.colors.background },
  detailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  detailTitleMobile: { fontSize: 18, fontWeight: 'bold', flex: 1 },
  detailClose: { fontSize: 24, color: theme.colors.text.muted, marginLeft: 15 }
});