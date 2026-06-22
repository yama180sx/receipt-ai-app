import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator, 
  Platform, 
} from 'react-native';
import { categoryApi, receiptApi } from '../api';
import { getRecentYearMonths, useMonthSelectOptions } from '../utils/monthSelectOptions';
import { showAlert } from '../utils/alertMessage';
// Issue #66: BREAKPOINTS 参照
import { AppBackButton, AppModal, AppSelect } from '../components/ui';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { cardStyles } from '../theme/cardStyles';
import { screenLayout } from '../theme/screenLayout';
import { useIsWideLayout } from '../hooks/useIsWideLayout';
import { ReceiptDetailComponent } from '../components/ReceiptDetailComponent';
import type { CategorySummary, ReceiptDetail } from '../types/receipt';
import type { FamilyMemberSummary, ReceiptForSplitEditor } from '../types/settlement';

interface HistoryScreenProps {
  onBack: () => void;
  currentMemberId: number; 
  onGoToSplitEditor?: (receipt: ReceiptForSplitEditor) => void;
}

/**
 * [Issue #67 / #64 / Web・ネイティブ完全互換] 履歴一覧画面
 */
export default function HistoryScreen({ onBack, currentMemberId, onGoToSplitEditor }: HistoryScreenProps) {
  const isWide = useIsWideLayout();

  const [loading, setLoading] = useState(true);
  const [receipts, setReceipts] = useState<ReceiptDetail[]>([]);
  const [categories, setCategories] = useState<CategorySummary[]>([]);
  const [members, setMembers] = useState<FamilyMemberSummary[]>([]);
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptDetail | null>(null);
  
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedMember, setSelectedMember] = useState(currentMemberId.toString());

  const months = useMemo(() => getRecentYearMonths(6), []);

  const monthSelectOptions = useMonthSelectOptions(months, isWide);

  const memberSelectOptions = useMemo(
    () =>
      members.map((m) => ({
        label: m.id === currentMemberId ? `自分 (${m.name})` : m.name,
        value: m.id.toString(),
      })),
    [members, currentMemberId]
  );

  const API_URL = process.env.EXPO_PUBLIC_API_URL || '';
  const BASE_URL = API_URL.replace(/\/api\/?$/, '');

  // カテゴリマスタの取得
  const fetchCategories = useCallback(async () => {
    try {
      const res = await categoryApi.listCategories();
      if (res.success) {
        setCategories(res.data);
      }
    } catch (err) {
      console.error('カテゴリー取得失敗', err);
    }
  }, []);

  // ★ Issue #64: 所属世帯のメンバー一覧を取得
  const fetchMembers = useCallback(async () => {
    try {
      const res = await receiptApi.getFamilyMembers();
      if (res.success) {
        setMembers(res.data);
      }
    } catch (err) {
      console.error('世帯メンバー取得失敗', err);
    }
  }, []);

  // 履歴データの取得
  const fetchReceipts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await receiptApi.listReceipts({
        ...(selectedMonth ? { month: selectedMonth } : {}),
        memberId: selectedMember,
      });
      if (res.success) {
        const data = res.data;
        setReceipts(data);
        
        // 編集・保存後に選択中データの参照を最新に更新
        if (selectedReceipt) {
          const updated = data.find((r: ReceiptDetail) => r.id === selectedReceipt.id);
          if (updated) setSelectedReceipt(updated);
        } else if (isWide && data.length > 0) {
          // 初回ロード時は1件目を選択
          setSelectedReceipt(data[0]);
        }
      }
    } catch (err) {
      console.error('履歴取得失敗', err);
      showAlert('エラー', '履歴の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedMember, isWide, selectedReceipt?.id]);

  useEffect(() => {
    fetchCategories();
    fetchMembers(); // ★ 初期化時にメンバーマスタをロード
  }, [fetchCategories, fetchMembers]);

  useEffect(() => {
    fetchReceipts();
  }, [selectedMonth, selectedMember]); // フィルタ変更時のみ自動発火

  // カテゴリのみの簡易変更処理（既存互換）
  const handleCategoryChange = async (itemId: number, categoryId: number | null) => {
    if (!categoryId) return;
    try {
      const response = await receiptApi.updateItemCategory(itemId, Number(categoryId));

      if (response.success) {
        const updatedItem = response.data;
        const mapper = (r: ReceiptDetail): ReceiptDetail => ({
          ...r,
          items: r.items.map((item) =>
            item.id === itemId ? { ...item, categoryId: updatedItem.categoryId, category: updatedItem.category } : item
          ),
        });

        setReceipts(prev => prev.map(mapper));
        if (selectedReceipt) setSelectedReceipt((prev) => (prev ? mapper(prev) : null));
      }
    } catch (err) {
      console.error('カテゴリー更新失敗', err);
      showAlert('エラー', 'カテゴリーの更新に失敗しました');
    }
  };

  const renderItem = ({ item }: { item: ReceiptDetail }) => {
    const isSelected = selectedReceipt?.id === item.id;
    const displayAmount = Math.round(item.totalAmount || 0);

    return (
      <TouchableOpacity 
        style={[cardStyles.listCard, styles.listCardExtra, isSelected && isWide && styles.activeCard]} 
        onPress={() => setSelectedReceipt(item)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.date}>
            {item.date ? new Date(item.date).toLocaleDateString('ja-JP') : '日付不明'}
          </Text>
          <Text style={[styles.store, isSelected && isWide && { color: colors.primary }]} numberOfLines={1}>
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

  return (
    <View style={screenLayout.container}>
      <View style={styles.mainWrapper}>
        <View style={screenLayout.header}>
          <AppBackButton onPress={onBack} />
          <Text style={screenLayout.headerTitle}>レシート履歴</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={[styles.filterContainer, isWide ? styles.filterContainerWide : styles.filterContainerMobile]}>
          <View style={[styles.filterSelectWrap, isWide && styles.filterSelectWrapWide]}>
            <AppSelect<string>
              selectedValue={selectedMonth}
              onValueChange={setSelectedMonth}
              options={monthSelectOptions}
              placeholder="全期間"
              placeholderValue=""
            />
          </View>
          <View style={[styles.filterSelectWrap, isWide && styles.filterSelectWrapWide]}>
            <AppSelect<string>
              selectedValue={selectedMember}
              onValueChange={setSelectedMember}
              options={memberSelectOptions}
              placeholder="世帯全体"
              placeholderValue=""
            />
          </View>
        </View>

        <View style={isWide ? styles.mainContentWide : styles.mainContentMobile}>
          <View style={isWide ? styles.masterPane : styles.fullPane}>
            {loading ? (
              <View style={styles.centerLoading}>
                <ActivityIndicator size="large" color={colors.primary} />
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
                  onGoToSplitEditor={onGoToSplitEditor} // ★ 追加: Componentへハンドラを渡す
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
        <AppModal
          visible={!!selectedReceipt}
          onRequestClose={() => setSelectedReceipt(null)}
          variant="sheet"
          title={selectedReceipt?.storeName || '店名不明'}
        >
          {selectedReceipt ? (
            <ReceiptDetailComponent
              receipt={selectedReceipt}
              categories={categories}
              onCategoryChange={handleCategoryChange}
              baseUrl={BASE_URL}
              fullWidth={true}
              onSaveSuccess={fetchReceipts}
              onGoToSplitEditor={onGoToSplitEditor}
            />
          ) : null}
        </AppModal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  mainWrapper: { flex: 1, width: '100%', alignSelf: 'stretch', paddingTop: Platform.OS === 'ios' ? 60 : 20 },
  filterContainer: { paddingHorizontal: spacing.md, marginBottom: spacing.md, gap: 8 },
  filterContainerMobile: { flexDirection: 'column' },
  filterContainerWide: { flexDirection: 'row', justifyContent: 'flex-start' },
  filterSelectWrap: { width: '100%', justifyContent: 'center' },
  filterSelectWrapWide: { flex: 1, width: undefined, minWidth: 160, maxWidth: 220 },
  mainContentMobile: { flex: 1 },
  mainContentWide: { flex: 1, flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.border },
  masterPane: { width: 350, height: '100%', backgroundColor: colors.surface, borderRightWidth: 1, borderRightColor: colors.border },
  fullPane: { flex: 1 },
  detailPane: { flex: 1, height: '100%', backgroundColor: colors.background },
  list: { padding: spacing.md },
  listCardExtra: { marginBottom: 10 },
  activeCard: { borderColor: colors.primary, backgroundColor: colors.semantic.active.bg, elevation: 0 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  date: { fontSize: 12, color: colors.text.muted },
  store: { fontWeight: '700', color: colors.text.main, flex: 1, marginLeft: 10, textAlign: 'right' },
  cardBody: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  amount: { fontSize: 18, fontWeight: 'bold', color: colors.primary },
  itemCountBadge: { backgroundColor: colors.background, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  itemCountText: { fontSize: 10, color: colors.secondary },
  empty: { textAlign: 'center', marginTop: 50, color: colors.text.muted },
  centerLoading: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 50 },
  emptyDetailWrapper: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});