import React from 'react';
import { Text, View } from 'react-native';
import { AppBackButton, AppModal } from '../components/ui';
import { ReceiptDetailComponent } from '../components/ReceiptDetailComponent';
import { ReceiptHistoryFilters, ReceiptHistoryList, useReceiptHistory } from '../features/history';
import { receiptHistoryStyles as styles } from '../features/history/styles/receiptHistoryStyles';
import { screenLayout } from '../theme/screenLayout';
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

  return (
    <View style={screenLayout.container}>
      <View style={styles.mainWrapper}>
        <View style={screenLayout.header}>
          <AppBackButton onPress={onBack} />
          <Text style={screenLayout.headerTitle}>レシート履歴</Text>
          <View style={{ width: 40 }} />
        </View>

        <ReceiptHistoryFilters
          isWide={history.isWide}
          searchQuery={history.searchQuery}
          selectedMonth={history.selectedMonth}
          selectedMember={history.selectedMember}
          monthSelectOptions={history.monthSelectOptions}
          memberSelectOptions={history.memberSelectOptions}
          onSearchQueryChange={history.setSearchQuery}
          onMonthChange={history.setSelectedMonth}
          onMemberChange={history.setSelectedMember}
        />

        <View style={history.isWide ? styles.mainContentWide : styles.mainContentMobile}>
          <View style={history.isWide ? styles.masterPane : styles.fullPane}>
            <ReceiptHistoryList
              receipts={history.receipts}
              selectedReceiptId={history.selectedReceipt?.id}
              isWide={history.isWide}
              loading={history.loading}
              loadingMore={history.loadingMore}
              hasNext={history.hasNext}
              onSelectReceipt={history.setSelectedReceipt}
              onLoadMore={() => void history.loadMore()}
            />
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
