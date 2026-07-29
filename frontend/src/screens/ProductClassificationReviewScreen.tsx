import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { ProductClassificationCorrectionModal } from '../components/ProductClassificationCorrectionModal';
import { AppBackButton } from '../components/ui';
import {
  ProductClassificationReviewFilters,
  ProductClassificationReviewList,
  useProductClassificationReview,
} from '../features/productClassification';
import { colors } from '../theme/colors';
import { screenLayout } from '../theme/screenLayout';

type Props = { onBack: () => void };

export default function ProductClassificationReviewScreen({ onBack }: Props) {
  const review = useProductClassificationReview();
  return <View style={screenLayout.container}>
    <View style={screenLayout.header}>
      <AppBackButton onPress={onBack} />
      <Text style={screenLayout.headerTitle}>商品分類の確認</Text>
      <View style={styles.headerSpacer} />
    </View>
    <ProductClassificationReviewFilters
      statuses={review.statuses} statusOptions={review.statusOptions} categoryId={review.categoryId}
      categoryOptions={review.categoryOptions} month={review.month} monthOptions={review.monthOptions}
      onToggleStatus={review.toggleStatus} onCategoryChange={review.setCategoryId} onMonthChange={review.setMonth}
    />
    {review.loading ? <View style={styles.loading}><ActivityIndicator size="large" color={colors.primary} /></View>
      : <ProductClassificationReviewList items={review.items} onSelect={(entry) => void review.openCorrection(entry.item)} />}
    <ProductClassificationCorrectionModal
      item={review.correctionItem} productTypes={review.productTypes} selectedProductTypeId={review.correctionProductTypeId}
      scope={review.correctionScope} classificationName={review.classificationName} loading={review.correctionLoading}
      onClose={review.closeCorrection} onProductTypeChange={review.setCorrectionProductTypeId}
      onScopeChange={review.setCorrectionScope} onClassificationNameChange={review.setClassificationName}
      onSave={() => void review.saveCorrection()}
    />
  </View>;
}

const styles = StyleSheet.create({ headerSpacer: { width: 40 }, loading: { flex: 1, justifyContent: 'center', alignItems: 'center' } });
