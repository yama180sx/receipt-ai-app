import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { AppBackButton, AppModal, AppSelect } from '../components/ui';
import { ReceiptDetailComponent } from '../components/ReceiptDetailComponent';
import { useReceiptHistory } from '../features/history';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { cardStyles } from '../theme/cardStyles';
import { screenLayout } from '../theme/screenLayout';
import type { ReceiptDetail } from '../types/receipt';
import type { ReceiptForSplitEditor } from '../types/settlement';

interface HistoryScreenProps {
  onBack: () => void;
  currentMemberId: number;
  onGoToSplitEditor?: (receipt: ReceiptForSplitEditor) => void;
}

/**
 * [Issue #67 / #64 / #100-14] 履歴一覧画面 — Hook + UI の薄型 Screen
 */
export default function HistoryScreen({ onBack, currentMemberId, onGoToSplitEditor }: HistoryScreenProps) {
  const history = useReceiptHistory({ currentMemberId });

  const renderItem = ({ item }: { item: ReceiptDetail }) => {
    const isSelected = history.selectedReceipt?.id === item.id;
    const displayAmount = Math.round(item.totalAmount || 0);

    return (
      <TouchableOpacity
        style={[cardStyles.listCard, styles.listCardExtra, isSelected && history.isWide && styles.activeCard]}
        onPress={() => history.setSelectedReceipt(item)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.date}>
            {item.date ? new Date(item.date).toLocaleDateString('ja-JP') : '日付不明'}
          </Text>
          <Text style={[styles.store, isSelected && history.isWide && { color: colors.primary }]} numberOfLines={1}>
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

        <View style={[styles.filterContainer, history.isWide ? styles.filterContainerWide : styles.filterContainerMobile]}>
          <View style={[styles.filterSelectWrap, history.isWide && styles.filterSelectWrapWide]}>
            <AppSelect<string>
              selectedValue={history.selectedMonth}
              onValueChange={history.setSelectedMonth}
              options={history.monthSelectOptions}
              placeholder="全期間"
              placeholderValue=""
            />
          </View>
          <View style={[styles.filterSelectWrap, history.isWide && styles.filterSelectWrapWide]}>
            <AppSelect<string>
              selectedValue={history.selectedMember}
              onValueChange={history.setSelectedMember}
              options={history.memberSelectOptions}
              placeholder="世帯全体"
              placeholderValue=""
            />
          </View>
        </View>

        <View style={history.isWide ? styles.mainContentWide : styles.mainContentMobile}>
          <View style={history.isWide ? styles.masterPane : styles.fullPane}>
            {history.loading ? (
              <View style={styles.centerLoading}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : (
              <FlatList
                data={history.receipts}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderItem}
                contentContainerStyle={styles.list}
                ListEmptyComponent={<Text style={styles.empty}>該当する履歴がありません</Text>}
                initialNumToRender={15}
              />
            )}
          </View>

          {history.isWide && (
            <View style={styles.detailPane}>
              {history.selectedReceipt ? (
                <ReceiptDetailComponent
                  receipt={history.selectedReceipt}
                  categories={history.categories}
                  onCategoryChange={history.handleCategoryChange}
                  baseUrl={history.baseUrl}
                  fullWidth={false}
                  onSaveSuccess={history.fetchReceipts}
                  onGoToSplitEditor={onGoToSplitEditor}
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

      {!history.isWide && (
        <AppModal
          visible={!!history.selectedReceipt}
          onRequestClose={() => history.setSelectedReceipt(null)}
          variant="sheet"
          title={history.selectedReceipt?.storeName || '店名不明'}
        >
          {history.selectedReceipt ? (
            <ReceiptDetailComponent
              receipt={history.selectedReceipt}
              categories={history.categories}
              onCategoryChange={history.handleCategoryChange}
              baseUrl={history.baseUrl}
              fullWidth={true}
              onSaveSuccess={history.fetchReceipts}
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
