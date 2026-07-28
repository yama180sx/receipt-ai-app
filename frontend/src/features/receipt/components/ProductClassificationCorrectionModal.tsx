import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AppButton, AppModal, AppSelect, AppTextInput } from '../../../components/ui';
import type { ProductTypeSummary, ReceiptItemDetail } from '../../../api/generated';
import type { ProductClassificationCorrectionScope } from '../../../api/receiptApi';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';

type Props = {
  item: ReceiptItemDetail | null;
  productTypes: ProductTypeSummary[];
  selectedProductTypeId: number | null;
  scope: ProductClassificationCorrectionScope;
  classificationName: string;
  loading: boolean;
  onClose: () => void;
  onProductTypeChange: (productTypeId: number | null) => void;
  onScopeChange: (scope: ProductClassificationCorrectionScope) => void;
  onClassificationNameChange: (value: string) => void;
  onSave: () => void;
};

const scopeOptions: Array<{ value: ProductClassificationCorrectionScope; label: string; detail: string }> = [
  { value: 'item_only', label: 'この明細だけ', detail: '明細の修正履歴のみ残します。' },
  { value: 'same_ocr_name', label: '同じOCR商品名にも適用', detail: '同じOCR商品名を世帯内で再利用します。' },
  { value: 'same_classification_name', label: '同じ分類用名称にも適用', detail: '入力した分類用名称を世帯内の別名として再利用します。' },
];

export const ProductClassificationCorrectionModal: React.FC<Props> = ({
  item,
  productTypes,
  selectedProductTypeId,
  scope,
  classificationName,
  loading,
  onClose,
  onProductTypeChange,
  onScopeChange,
  onClassificationNameChange,
  onSave,
}) => (
  <AppModal
    visible={Boolean(item)}
    onRequestClose={onClose}
    title="商品種別を修正"
    description={item ? `対象明細: ${item.name}` : undefined}
    footer={
      <>
        <AppButton title="キャンセル" variant="outline" onPress={onClose} disabled={loading} />
        <AppButton
          title="保存"
          onPress={onSave}
          loading={loading}
          disabled={!selectedProductTypeId || (scope === 'same_classification_name' && !classificationName.trim())}
        />
      </>
    }
  >
    <Text style={styles.label}>商品種別</Text>
    <AppSelect<number | null>
      selectedValue={selectedProductTypeId}
      onValueChange={onProductTypeChange}
      options={productTypes.map((productType) => ({ label: productType.name, value: productType.id }))}
      placeholder="商品種別を選択"
    />

    <Text style={styles.label}>適用範囲</Text>
    {scopeOptions.map((option) => {
      const selected = option.value === scope;
      return (
        <TouchableOpacity
          key={option.value}
          style={[styles.scopeOption, selected && styles.scopeOptionSelected]}
          onPress={() => onScopeChange(option.value)}
          accessibilityRole="radio"
          accessibilityState={{ selected }}
        >
          <Text style={[styles.scopeLabel, selected && styles.scopeLabelSelected]}>{option.label}</Text>
          <Text style={styles.scopeDetail}>{option.detail}</Text>
        </TouchableOpacity>
      );
    })}

    {scope === 'same_classification_name' ? (
      <View style={styles.classificationNameField}>
        <Text style={styles.label}>分類用名称</Text>
        <AppTextInput
          value={classificationName}
          onChangeText={onClassificationNameChange}
          placeholder="例：牛乳"
          autoCapitalize="none"
        />
        <Text style={styles.fieldHint}>この名称を同じ商品種別として世帯内で再利用します。</Text>
      </View>
    ) : null}
  </AppModal>
);

const styles = StyleSheet.create({
  label: { color: colors.text.main, fontSize: 14, fontWeight: '600', marginBottom: spacing.xs, marginTop: spacing.sm },
  scopeOption: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: spacing.sm, marginTop: spacing.xs },
  scopeOptionSelected: { borderColor: colors.primary, backgroundColor: colors.semantic.active.bg },
  scopeLabel: { color: colors.text.main, fontSize: 14, fontWeight: '600' },
  scopeLabelSelected: { color: colors.primary },
  scopeDetail: { color: colors.text.muted, fontSize: 12, marginTop: 2 },
  classificationNameField: { marginTop: spacing.sm },
  fieldHint: { color: colors.text.muted, fontSize: 12, marginTop: spacing.xs },
});
