import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { ProductClassificationStatsData } from '../../../api/generated';
import { cardStyles } from '../../../theme/cardStyles';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';

type Props = { data: ProductClassificationStatsData | null };
const statusLabels: Record<string, string> = { needs_review: '要確認', unclassified: '未分類', outside_initial_scope: '初期分類の対象外' };

export const ProductClassificationStatsSection: React.FC<Props> = ({ data }) => <View style={cardStyles.section}>
  <Text style={styles.title}>商品分類の内訳</Text>
  {data?.categoryStats.map((category) => <View key={category.standardCategoryId} style={styles.category}>
    <Text style={styles.categoryName}>{category.parentCategoryName} ＞ {category.standardCategoryName}</Text>
    {category.productTypes.map((productType) => <View key={productType.productTypeId} style={styles.row}>
      <Text style={styles.name}>{productType.productTypeName}</Text><Text style={styles.amount}>¥{Math.round(productType.totalAmount).toLocaleString()}（{productType.itemCount}点）</Text>
    </View>)}
  </View>)}
  {data?.unresolved.length ? <View style={styles.unresolved}><Text style={styles.unresolvedTitle}>ProductType 未確定（特定種別には含めません）</Text>
    {data.unresolved.map((stat) => <View key={stat.status} style={styles.row}><Text style={styles.name}>{statusLabels[stat.status] ?? stat.status}</Text><Text style={styles.amount}>¥{Math.round(stat.totalAmount).toLocaleString()}（{stat.itemCount}点）</Text></View>)}
  </View> : null}
  {!data?.categoryStats.length && !data?.unresolved.length ? <Text style={styles.empty}>商品分類の対象明細はありません</Text> : null}
</View>;
const styles = StyleSheet.create({ title: { color: colors.text.main, fontSize: 18, fontWeight: '700', marginBottom: spacing.sm }, category: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm, marginTop: spacing.sm }, categoryName: { color: colors.text.main, fontWeight: '700' }, row: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm, marginTop: 4 }, name: { color: colors.text.muted, flex: 1 }, amount: { color: colors.text.main, fontSize: 12 }, unresolved: { borderTopWidth: 1, borderTopColor: colors.border, marginTop: spacing.md, paddingTop: spacing.sm }, unresolvedTitle: { color: colors.text.main, fontWeight: '700' }, empty: { color: colors.text.muted } });
