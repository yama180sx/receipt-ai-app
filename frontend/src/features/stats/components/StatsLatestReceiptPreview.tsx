import React from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import type { ReceiptDetail } from '../../../api/generated';
import type { ReceiptImageSource } from '../../../utils/receiptImageSource';
import { statsScreenStyles } from '../styles/statsScreenStyles';

type Props = {
  receipt: ReceiptDetail | null | undefined;
  imageSource: ReceiptImageSource | null | undefined;
  onPress: () => void;
};

export const StatsLatestReceiptPreview: React.FC<Props> = ({ receipt, imageSource, onPress }) => {
  if (!receipt?.imagePath || !imageSource) {
    return (
      <View style={statsScreenStyles.noImageBox}>
        <Text style={statsScreenStyles.noDataText}>画像なし</Text>
      </View>
    );
  }

  return (
    <TouchableOpacity style={statsScreenStyles.receiptPreviewCard} onPress={onPress}>
      <Image source={imageSource} style={statsScreenStyles.receiptImage} resizeMode="cover" />
      <View style={statsScreenStyles.receiptInfoOverlay}>
        <View style={statsScreenStyles.receiptInfoMain}>
          <Text style={statsScreenStyles.receiptStoreName} numberOfLines={1}>
            {receipt.storeName || '店名不明'}
          </Text>
          {receipt.taxAmount ? (
            <Text style={statsScreenStyles.taxSubText}>
              内、消費税 ¥{receipt.taxAmount.toLocaleString()}
            </Text>
          ) : null}
        </View>
        <Text style={statsScreenStyles.receiptAmount}>
          ¥{Math.round(Number(receipt.totalAmount) || 0).toLocaleString()}
        </Text>
      </View>
    </TouchableOpacity>
  );
};
