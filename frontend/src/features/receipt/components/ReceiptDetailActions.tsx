import React from 'react';
import { AppButton } from '../../../components/ui';
import { BUTTON_LABELS } from '../../../constants/buttonLabels';
import type { ReceiptDetail } from '../../../types/receipt';
import type { ReceiptForSplitEditor } from '../../../types/settlement';
import { receiptDetailStyles as styles } from '../styles/receiptDetailStyles';

type Props = {
  isEditing: boolean;
  loading: boolean;
  isWide: boolean;
  receipt: ReceiptDetail;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSave: () => void;
  onGoToSplitEditor?: (receipt: ReceiptForSplitEditor) => void;
};

export const ReceiptDetailActions: React.FC<Props> = ({
  isEditing,
  loading,
  isWide,
  receipt,
  onStartEdit,
  onCancelEdit,
  onSave,
  onGoToSplitEditor,
}) => (
  <View style={styles.editControls}>
    {isEditing ? (
      <>
        <AppButton title={BUTTON_LABELS.cancel} onPress={onCancelEdit} variant="secondary" size="sm" />
        <AppButton title={BUTTON_LABELS.save} onPress={onSave} loading={loading} disabled={loading} size="sm" />
      </>
    ) : (
      <>
        {onGoToSplitEditor && isWide && receipt.memberId != null ? (
          <AppButton
            title="➗ 割り勘"
            onPress={() => {
              const memberId = receipt.memberId!;
              onGoToSplitEditor({
                id: receipt.id,
                memberId,
                imagePath: receipt.imagePath,
                storeName: receipt.storeName,
                items: receipt.items,
              });
            }}
            variant="outline"
            size="sm"
            style={styles.splitButtonOverride}
          />
        ) : null}
        <AppButton title={`✎ ${BUTTON_LABELS.edit}`} onPress={onStartEdit} variant="secondary" size="sm" />
      </>
    )}
  </View>
);
