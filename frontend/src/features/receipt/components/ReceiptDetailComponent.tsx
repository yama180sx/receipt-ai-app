import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import type { CategorySummary, ReceiptDetail } from '../../../types/receipt';
import type { ReceiptForSplitEditor } from '../../../types/settlement';
import { useReceiptDetail } from '../hooks/useReceiptDetail';
import { ReceiptDetailActions } from './ReceiptDetailActions';
import { ReceiptDetailHeader } from './ReceiptDetailHeader';
import { ReceiptDetailImagePanel } from './ReceiptDetailImagePanel';
import { ReceiptDetailItemList } from './ReceiptDetailItemList';
import { receiptDetailStyles as styles } from '../styles/receiptDetailStyles';

export interface ReceiptDetailComponentProps {
  receipt: ReceiptDetail | null | undefined;
  categories: CategorySummary[];
  onCategoryChange: (itemId: number, categoryId: number | null) => void;
  baseUrl: string;
  fullWidth?: boolean;
  onSaveSuccess?: () => void;
  onGoToSplitEditor?: (receipt: ReceiptForSplitEditor) => void;
}

/** Issue #100-12 (#436): レシート詳細 — 表示・編集の orchestrator */
export const ReceiptDetailComponent: React.FC<ReceiptDetailComponentProps> = ({
  receipt,
  categories,
  onCategoryChange,
  baseUrl: _baseUrl,
  fullWidth = true,
  onSaveSuccess,
  onGoToSplitEditor,
}) => {
  const detail = useReceiptDetail({ receipt, categories, fullWidth, onSaveSuccess });

  if (!detail.receipt || !detail.editData) {
    return (
      <View style={styles.placeholderContainer}>
        <Text style={styles.emptyText}>レシートを選択してください</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.detailScroll}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ flexGrow: 1 }}
    >
      <View style={detail.isWide ? styles.wideContentWrapper : styles.mobileContentWrapper}>
        <ReceiptDetailImagePanel
          receipt={detail.receipt}
          imageSource={detail.imageSourceWithCache}
          isWide={detail.isWide}
        />

        <View style={detail.isWide ? styles.wideInfoColumn : styles.mobileInfoArea}>
          <ReceiptDetailActions
            isEditing={detail.isEditing}
            loading={detail.loading}
            isWide={detail.isWide}
            receipt={detail.receipt}
            onStartEdit={() => detail.setIsEditing(true)}
            onCancelEdit={() => detail.setIsEditing(false)}
            onSave={() => void detail.handleSave()}
            onGoToSplitEditor={onGoToSplitEditor}
          />

          <ReceiptDetailHeader
            isEditing={detail.isEditing}
            receipt={detail.receipt}
            editData={detail.editData}
            displayTotal={detail.displayTotal}
            onUpdateField={detail.updateEditField}
          />

          <ReceiptDetailItemList
            isEditing={detail.isEditing}
            receipt={detail.receipt}
            editData={detail.editData}
            categorySelectOptions={detail.categorySelectOptions}
            onCategoryChange={onCategoryChange}
            onUpdateItem={detail.updateEditItem}
            onUpdateField={detail.updateEditField}
          />
        </View>
      </View>
      <View style={styles.scrollFooter} />
    </ScrollView>
  );
};

export default ReceiptDetailComponent;
