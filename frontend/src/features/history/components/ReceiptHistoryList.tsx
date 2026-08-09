import React from 'react';
import { ActivityIndicator, FlatList, Text, TouchableOpacity, View } from 'react-native';
import { cardStyles } from '../../../theme/cardStyles';
import { colors } from '../../../theme/colors';
import type { ReceiptDetail } from '../../../types/receipt';
import { receiptHistoryStyles as styles } from '../styles/receiptHistoryStyles';

type ReceiptHistoryListProps = {
  receipts: ReceiptDetail[];
  selectedReceiptId?: number;
  isWide: boolean;
  loading: boolean;
  loadingMore: boolean;
  hasNext: boolean;
  onSelectReceipt: (receipt: ReceiptDetail) => void;
  onLoadMore: () => void;
};

export function ReceiptHistoryList({
  receipts,
  selectedReceiptId,
  isWide,
  loading,
  loadingMore,
  hasNext,
  onSelectReceipt,
  onLoadMore,
}: ReceiptHistoryListProps) {
  if (loading) {
    return (
      <View style={styles.centerLoading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <FlatList
      data={receipts}
      keyExtractor={(item) => item.id.toString()}
      renderItem={({ item }) => {
        const isSelected = selectedReceiptId === item.id;
        const displayAmount = Math.round(item.totalAmount || 0);

        return (
          <TouchableOpacity
            style={[cardStyles.listCard, styles.listCardExtra, isSelected && isWide && styles.activeCard]}
            onPress={() => onSelectReceipt(item)}
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
              <Text style={styles.amount}>¥{displayAmount.toLocaleString()}</Text>
              <View style={styles.itemCountBadge}>
                <Text style={styles.itemCountText}>{(item.items?.length || 0)} 点</Text>
              </View>
            </View>
          </TouchableOpacity>
        );
      }}
      contentContainerStyle={styles.list}
      ListEmptyComponent={<Text style={styles.empty}>該当する履歴がありません</Text>}
      ListFooterComponent={hasNext ? (
        <View style={styles.loadMoreContainer}>
          <TouchableOpacity
            style={[styles.loadMoreButton, loadingMore && styles.loadMoreButtonDisabled]}
            onPress={onLoadMore}
            disabled={loadingMore}
            activeOpacity={0.7}
          >
            {loadingMore ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text style={styles.loadMoreText}>さらに読み込む</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : null}
      initialNumToRender={15}
    />
  );
}
