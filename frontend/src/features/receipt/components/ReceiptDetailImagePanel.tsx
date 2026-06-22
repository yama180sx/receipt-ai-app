import React from 'react';
import { Image, Text, View } from 'react-native';
import type { ReceiptImageSource } from '../../../utils/receiptImageSource';
import type { ReceiptDetail } from '../../../types/receipt';
import { receiptDetailStyles as styles } from '../styles/receiptDetailStyles';

type Props = {
  receipt: ReceiptDetail;
  imageSource: ReceiptImageSource | null;
  isWide: boolean;
};

export const ReceiptDetailImagePanel: React.FC<Props> = ({ receipt, imageSource, isWide }) => (
  <View style={isWide ? styles.wideImageColumn : styles.mobileImageArea}>
    <View style={[styles.imageWrapper, !isWide && styles.mobileImageWrapper]}>
      {receipt.imagePath && imageSource ? (
        <Image source={imageSource} style={styles.receiptImage} resizeMode="contain" />
      ) : (
        <View style={styles.noImagePlaceholder}>
          <Text style={styles.emptyText}>画像なし</Text>
        </View>
      )}
    </View>
  </View>
);
