import React from 'react';
import { Text, View } from 'react-native';
import { AppTextInput } from '../../../components/ui';
import type { ReceiptDetail } from '../../../types/receipt';
import { receiptDetailStyles as styles } from '../styles/receiptDetailStyles';

type Props = {
  isEditing: boolean;
  receipt: ReceiptDetail;
  editData: ReceiptDetail;
  displayTotal: number;
  onUpdateField: (key: keyof ReceiptDetail, value: ReceiptDetail[keyof ReceiptDetail] | string) => void;
};

export const ReceiptDetailHeader: React.FC<Props> = ({
  isEditing,
  receipt,
  editData,
  displayTotal,
  onUpdateField,
}) => (
  <>
    <View style={styles.detailHeaderInner}>
      {isEditing ? (
        <AppTextInput
          style={styles.titleInput}
          inputStyle={styles.titleInputText}
          value={editData.storeName}
          onChangeText={(val) => onUpdateField('storeName', val)}
          placeholder="店舗名"
        />
      ) : (
        <Text style={styles.detailTitle} selectable>
          {receipt.storeName || '店名不明'}
        </Text>
      )}

      {isEditing ? (
        <AppTextInput
          style={styles.dateInput}
          value={editData.date ? new Date(editData.date).toISOString().replace('T', ' ').substring(0, 16) : ''}
          onChangeText={(val) => onUpdateField('date', val)}
          placeholder="YYYY-MM-DD HH:mm"
        />
      ) : (
        <Text style={styles.detailDate}>
          {receipt.date
            ? new Date(receipt.date).toLocaleString('ja-JP', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
              })
            : '日付不明'}
        </Text>
      )}
    </View>

    <View style={styles.detailTotalContainer}>
      <Text style={styles.detailTotalLabel}>最終支払額（税込）</Text>
      <Text style={styles.detailTotalValue}>¥{displayTotal.toLocaleString()}</Text>
    </View>
  </>
);
