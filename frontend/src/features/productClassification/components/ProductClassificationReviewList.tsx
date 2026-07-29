import React from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { ProductClassificationReviewItem } from '../../../api/generated';
import { getProductClassificationDisplay } from '../../../utils/productClassificationDisplay';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';

type Props = { items: ProductClassificationReviewItem[]; onSelect: (item: ProductClassificationReviewItem) => void };

export const ProductClassificationReviewList: React.FC<Props> = ({ items, onSelect }) => <FlatList
  data={items} keyExtractor={(entry) => String(entry.item.id)} contentContainerStyle={items.length ? styles.list : styles.emptyList}
  ListEmptyComponent={<Text style={styles.empty}>該当する明細はありません</Text>}
  renderItem={({ item: entry }) => {
    const classification = getProductClassificationDisplay(entry.item);
    return <TouchableOpacity style={styles.card} onPress={() => onSelect(entry)} accessibilityRole="button">
      <View style={styles.head}><Text style={styles.name}>{entry.item.name}</Text><Text style={styles.price}>¥{Math.round(entry.item.price * entry.item.quantity).toLocaleString()}</Text></View>
      <Text style={styles.store}>{entry.storeName}・{entry.receiptDate ? new Date(entry.receiptDate).toLocaleDateString('ja-JP') : '日付不明'}</Text>
      <Text style={styles.detail}>{classification.label}{classification.detail ? `（${classification.detail}）` : ''}</Text>
      <Text style={styles.action}>タップして商品種別を修正</Text>
    </TouchableOpacity>;
  }}
/>;

const styles = StyleSheet.create({
  list: { padding: spacing.md, gap: spacing.sm }, emptyList: { flexGrow: 1, justifyContent: 'center' },
  empty: { textAlign: 'center', color: colors.text.muted }, card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: spacing.md },
  head: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm }, name: { flex: 1, color: colors.text.main, fontSize: 16, fontWeight: '700' },
  price: { color: colors.primary, fontWeight: '700' }, store: { color: colors.text.muted, fontSize: 12, marginTop: 4 }, detail: { color: colors.text.main, marginTop: spacing.xs },
  action: { color: colors.primary, fontSize: 12, fontWeight: '600', marginTop: spacing.sm },
});
