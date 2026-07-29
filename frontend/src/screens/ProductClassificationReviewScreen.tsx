import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  AppBackButton,
  AppButton,
  AppSelect,
  AppTextInput,
} from '../components/ui';
import { ProductClassificationCorrectionModal } from '../features/receipt/components/ProductClassificationCorrectionModal';
import { useProductClassificationReview } from '../features/productClassification';
import type {
  ProductClassificationReviewItem,
  ProductTypeStatus,
} from '../api/generated';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { screenLayout } from '../theme/screenLayout';

type ReviewStatus = Exclude<ProductTypeStatus, 'classified' | 'not_applicable'>;

const statusOptions: Array<{ label: string; value: ReviewStatus }> = [
  { label: '要確認', value: 'needs_review' },
  { label: '未分類', value: 'unclassified' },
  { label: '初期分類範囲外', value: 'outside_initial_scope' },
];

const statusLabels: Record<ReviewStatus, string> = {
  needs_review: '要確認',
  unclassified: '未分類',
  outside_initial_scope: '初期分類範囲外',
};

export default function ProductClassificationReviewScreen({ onBack }: { onBack: () => void }) {
  const review = useProductClassificationReview();

  const renderItem = ({ item }: { item: ProductClassificationReviewItem }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => review.openCorrection(item)}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>
            {statusLabels[item.productTypeStatus as ReviewStatus]}
          </Text>
        </View>
        <Text style={styles.date}>
          {item.receipt.date
            ? new Date(item.receipt.date).toLocaleDateString('ja-JP')
            : '日付不明'}
        </Text>
      </View>
      <Text style={styles.itemName}>{item.name}</Text>
      <Text style={styles.receiptName}>{item.receipt.storeName}</Text>
      <View style={styles.cardFooter}>
        <Text style={styles.category}>{item.category?.name ?? 'カテゴリなし'}</Text>
        <Text style={styles.amount}>
          ¥{Math.round(item.price * item.quantity).toLocaleString()}
        </Text>
      </View>
      {item.candidates.length > 0 ? (
        <Text style={styles.candidates} numberOfLines={1}>
          候補: {item.candidates.map((candidate) => candidate.productType.name).join('、')}
        </Text>
      ) : null}
    </TouchableOpacity>
  );

  return (
    <View style={screenLayout.container}>
      <View style={styles.wrapper}>
        <View style={screenLayout.header}>
          <AppBackButton onPress={onBack} />
          <View style={styles.titleGroup}>
            <Text style={screenLayout.headerTitle}>商品分類の確認</Text>
            <Text style={styles.count}>{review.total}件</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.filters}>
          <View style={styles.filterField}>
            <Text style={styles.filterLabel}>状態</Text>
            <AppSelect<ReviewStatus | ''>
              selectedValue={review.status}
              onValueChange={review.setStatus}
              options={statusOptions}
              placeholder="未確定をすべて"
              placeholderValue=""
            />
          </View>
          <View style={styles.filterField}>
            <Text style={styles.filterLabel}>カテゴリ</Text>
            <AppSelect<number | null>
              selectedValue={review.categoryId}
              onValueChange={review.setCategoryId}
              options={review.categories.map((category) => ({
                label: category.name,
                value: category.id,
              }))}
              placeholder="すべてのカテゴリ"
            />
          </View>
          <View style={styles.filterField}>
            <Text style={styles.filterLabel}>開始日</Text>
            <AppTextInput
              value={review.draftFrom}
              onChangeText={review.setDraftFrom}
              placeholder="YYYY-MM-DD"
              autoCapitalize="none"
            />
          </View>
          <View style={styles.filterField}>
            <Text style={styles.filterLabel}>終了日</Text>
            <AppTextInput
              value={review.draftTo}
              onChangeText={review.setDraftTo}
              placeholder="YYYY-MM-DD"
              autoCapitalize="none"
            />
          </View>
          <View style={styles.filterButton}>
            <AppButton title="期間を適用" size="sm" onPress={review.applyDateRange} />
          </View>
        </View>

        {review.loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <FlatList
            data={review.items}
            renderItem={renderItem}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <Text style={styles.empty}>確認が必要な明細はありません</Text>
            }
          />
        )}

        <View style={styles.pagination}>
          <AppButton
            title="前へ"
            size="sm"
            variant="outline"
            disabled={review.page <= 1 || review.loading}
            onPress={() => review.setPage(review.page - 1)}
          />
          <Text style={styles.pageText}>
            {review.totalPages === 0 ? 0 : review.page} / {review.totalPages}
          </Text>
          <AppButton
            title="次へ"
            size="sm"
            variant="outline"
            disabled={review.page >= review.totalPages || review.loading}
            onPress={() => review.setPage(review.page + 1)}
          />
        </View>
      </View>

      <ProductClassificationCorrectionModal
        item={review.correctionItem}
        productTypes={review.productTypes}
        selectedProductTypeId={review.selectedProductTypeId}
        scope={review.scope}
        classificationName={review.classificationName}
        loading={review.saving}
        onClose={review.closeCorrection}
        onProductTypeChange={review.setSelectedProductTypeId}
        onScopeChange={review.setScope}
        onClassificationNameChange={review.setClassificationName}
        onSave={() => void review.saveCorrection()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    width: '100%',
    maxWidth: 1100,
    alignSelf: 'center',
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
  },
  titleGroup: { alignItems: 'center' },
  count: { color: colors.text.muted, fontSize: 12, marginTop: 2 },
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  filterField: { flexGrow: 1, flexBasis: 160, minWidth: 140 },
  filterButton: { alignSelf: 'flex-end', paddingBottom: 4 },
  filterLabel: {
    color: colors.text.muted,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: spacing.md, paddingTop: 0 },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    backgroundColor: colors.semantic.warning.bg,
    borderColor: colors.semantic.warning.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  statusText: { color: colors.semantic.warning.text, fontSize: 11, fontWeight: '700' },
  date: { color: colors.text.muted, fontSize: 12 },
  itemName: { color: colors.text.main, fontSize: 17, fontWeight: '700', marginTop: spacing.sm },
  receiptName: { color: colors.text.muted, fontSize: 13, marginTop: 2 },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  category: { color: colors.secondary, fontSize: 13 },
  amount: { color: colors.primary, fontSize: 15, fontWeight: '700' },
  candidates: { color: colors.text.muted, fontSize: 12, marginTop: spacing.sm },
  empty: { color: colors.text.muted, textAlign: 'center', marginTop: 60 },
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  pageText: { color: colors.text.main, minWidth: 70, textAlign: 'center' },
});
