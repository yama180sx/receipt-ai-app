import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator, 
  Modal, 
  Platform, 
  Alert, 
  useWindowDimensions 
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import apiClient from '../utils/apiClient';
// Issue #66: BREAKPOINTS 参照
import { theme, BREAKPOINTS } from '../theme';
import { ReceiptDetailComponent } from '../components/ReceiptDetailComponent';

interface HistoryScreenProps {
  onBack: () => void;
  currentMemberId: number; 
}

/**
 * [Issue #67 / Web・ネイティブ完全互換] 履歴一覧画面
 * - 初期ロード時（selectedReceiptがnull）のWeb版レンダリングクラッシュを完全に防ぐヌルガードを導入。
 * - 大画面2カラム時、Web版でリストの高さが0pxに潰れるのを防ぐため height: '100%' をレイヤーへ強制。
 * - スマホ（縦画面・モーダル表示）とWeb/iPad（横並び2カラム）のスタイル競合を排除。
 */
export default function HistoryScreen({ onBack, currentMemberId }: HistoryScreenProps) {
  const { width: windowWidth } = useWindowDimensions();
  // Issue #66: 定数によるレスポンシブ判定
  const isWide = windowWidth >= BREAKPOINTS.TABLET; 

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

  // カテゴリマスタの取得
  const fetchCategories = useCallback(async () => {
    try {
      const res = await apiClient.get('/categories');
      if (res.data?.success) {
        setCategories(res.data.data);
      }
    } catch (err) {
      console.error('カテゴリー取得失敗', err);
    }
  }, []);

  // 履歴データの取得
  const fetchReceipts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/receipts', {
        params: { 
          memberId: selectedMember, 
          month: selectedMonth 
        }
      });
      if (res.data?.success) {
        const data = res.data.data;
        setReceipts(data);
        
        // 編集・保存後に選択中データの参照を最新に更新
        if (selectedReceipt) {
          const updated = data.find((r: any) => r.id === selectedReceipt.id);
          if (updated) setSelectedReceipt(updated);
        } else if (isWide && data.length > 0) {
          // 初回ロード時は1件目を選択
          setSelectedReceipt(data[0]);
        }
      }
    } catch (err) {
      console.error('履歴取得失敗', err);
      if (Platform.OS !== 'web') {
        Alert.alert('エラー', '履歴の取得に失敗しました');
      }
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedMember, isWide, selectedReceipt?.id]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    fetchReceipts();
  }, [selectedMonth, selectedMember]); // フィルタ変更時のみ自動発火

  // カテゴリのみの簡易変更処理（既存互換）
  const handleCategoryChange = async (itemId: number, categoryId: number | null) => {
    if (!categoryId) return;
    try {
      const response = await apiClient.patch(`/receipts/items/${itemId}`, 
        { categoryId: Number(categoryId) }
      );
      
      if (response.data?.success) {
        const updatedItem = response.data.data;
        const mapper = (r: any) => ({
          ...r,
          items: r.items.map((item: any) =>
            item.id === itemId ? { ...item, categoryId: updatedItem.categoryId, category: updatedItem.category } : item
          ),
        });

        setReceipts(prev => prev.map(mapper));
        if (selectedReceipt) setSelectedReceipt((prev: any) => mapper(prev));
      }
    } catch (err) {
      console.error('カテゴリー更新失敗', err);
      if (Platform.OS !== 'web') {
        Alert.alert('エラー', 'カテゴリーの更新に失敗しました');
      }
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    const isSelected = selectedReceipt?.id === item.id;
    const displayAmount = Math.round(item.totalAmount || 0);

    return (
      <TouchableOpacity 
        style={[styles.card, isSelected && isWide && styles.activeCard]} 
        onPress={() => setSelectedReceipt(item)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.date}>
            {item.date ? new Date(item.date).toLocaleDateString('ja-JP') : '日付不明'}
          </Text>
          <Text style={[styles.store, isSelected && isWide && { color: theme.colors.primary }]} numberOfLines={1}>
            {item.storeName || '店名不明'}
          </Text>
        </View>
        <View style={styles.cardBody}>
          <View>
            <Text style={styles.amount}>¥{displayAmount.toLocaleString()}</Text>
          </View>
          <View style={styles.itemCountBadge}>
            <Text style={styles.itemCountText}>{(item.items?.length || 0)} 点</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderMonthPicker = () => {
    if (Platform.OS === 'web') {
      return (
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          style={styles.webSelect}
        >
          <option value="">全期間</option>
          {months.map(m => (
            <option key={m} value={m}>{`${m.split('-')[0]}年${m.split('-')[1]}月`}</option>
          ))}
        </select>
      );
    }

    return (
      <Picker 
        selectedValue={selectedMonth} 
        onValueChange={setSelectedMonth} 
        style={styles.filterPicker}
        mode="dropdown"
      >
        <Picker.Item label="全期間" value="" />
        {months.map(m => (
          <Picker.Item key={m} label={`${m.split('-')[0]}年${m.split('-')[1]}月`} value={m} />
        ))}
      </Picker>
    );
  };

  const renderMemberPicker = () => {
    if (Platform.OS === 'web') {
      return (
        <select
          value={selectedMember}
          onChange={(e) => setSelectedMember(e.target.value)}
          style={styles.webSelect}
        >
          <option value={currentMemberId.toString()}>自分</option>
          <option value="">世帯全体</option>
        </select>
      );
    }

    return (
      <Picker 
        selectedValue={selectedMember} 
        onValueChange={setSelectedMember} 
        style={styles.filterPicker}
        mode="dropdown"
      >
        <Picker.Item label="自分" value={currentMemberId.toString()} />
        <Picker.Item label="世帯全体" value="" />
      </Picker>
    );
  };

  return (
    <View style={styles.container}>
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
            {renderMonthPicker()}
          </View>
          <View style={[styles.pickerBox, isWide && { width: 200, flex: 0 }]}>
            {renderMemberPicker()}
          </View>
        </View>

        <View style={isWide ? styles.mainContentWide : styles.mainContentMobile}>
          <View style={isWide ? styles.masterPane : styles.fullPane}>
            {loading ? (
              <View style={styles.centerLoading}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
              </View>
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

          {/* ★修正: 大画面表示時、データが読み込まれて選択されるまでのヌルクラッシュを防ぐプレースホルダーガード */}
          {isWide && (
            <View style={styles.detailPane}>
              {selectedReceipt ? (
                <ReceiptDetailComponent 
                  receipt={selectedReceipt}
                  categories={categories}
                  onCategoryChange={handleCategoryChange}
                  baseUrl={BASE_URL}
                  fullWidth={false}
                  onSaveSuccess={fetchReceipts}
                />
              ) : (
                <View style={styles.emptyDetailWrapper}>
                  <Text style={styles.empty}>レシートを選択してください</Text>
                </View>
              )}
            </View>
          )}
        </View>
      </View>

      {!isWide && (
        <Modal visible={!!selectedReceipt} animationType="slide" onRequestClose={() => setSelectedReceipt(null)}>
          <View style={styles.modalContent}>
            <View style={styles.detailHeader}>
              <Text style={styles.detailTitleMobile} numberOfLines={1}>
                {selectedReceipt?.storeName || '店名不明'}
              </Text>
              <TouchableOpacity onPress={() => setSelectedReceipt(null)}>
                <Text style={styles.detailClose}>✕</Text>
              </TouchableOpacity>
            </View>
            {/* ★修正: モーダル表示時も、タイミングによるヌル参照を徹底ガード */}
            {selectedReceipt && (
              <ReceiptDetailComponent 
                receipt={selectedReceipt}
                categories={categories}
                onCategoryChange={handleCategoryChange}
                baseUrl={BASE_URL}
                fullWidth={true}
                onSaveSuccess={fetchReceipts}
              />
            )}
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
  pickerBox: { flex: 1, height: 44, backgroundColor: theme.colors.surface, borderRadius: 8, justifyContent: 'center', borderWidth: 1, borderColor: theme.colors.border, overflow: 'hidden' },
  filterPicker: { width: '100%' },
  webSelect: {
    width: '100%',
    height: '100%',
    borderWidth: 0,
    backgroundColor: 'transparent',
    paddingLeft: 10,
    fontSize: 14,
    color: theme.colors.text.main,
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      },
      default: {},
    }),
  } as any,
  mainContentMobile: { flex: 1 },
  mainContentWide: { flex: 1, flexDirection: 'row', borderTopWidth: 1, borderTopColor: theme.colors.border },
  // ★重要修正: 横幅固定値を維持し、かつ親の row コンテナに追従させ Web上での高さ消失を完全に防ぐ
  masterPane: { width: 350, height: '100%', backgroundColor: theme.colors.surface, borderRightWidth: 1, borderRightColor: theme.colors.border },
  fullPane: { flex: 1 },
  // ★重要修正: 右ペインも大画面時は親コンテナの高さ 100% で追従
  detailPane: { flex: 1, height: '100%', backgroundColor: theme.colors.background },
  list: { padding: theme.spacing.md },
  card: { backgroundColor: theme.colors.surface, borderRadius: 12, padding: 15, marginBottom: 10, borderWidth: 1, borderColor: theme.colors.border },
  activeCard: { borderColor: theme.colors.primary, backgroundColor: '#F0F7FF', elevation: 0 },
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
  detailClose: { fontSize: 24, color: theme.colors.text.muted, marginLeft: 15 },
  // ★追加: センタリングインジケータおよびプレースホルダー位置固定用
  centerLoading: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 50 },
  emptyDetailWrapper: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});