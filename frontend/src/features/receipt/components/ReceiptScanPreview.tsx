import React from 'react';
import { View, Text, StyleSheet, ImageSourcePropType } from 'react-native';
import { ReceiptImageViewer } from './ReceiptImageViewer';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';
import { borderRadius } from '../../../theme/radii';

const c = colors;
const s = colors.semantic.scan;

type Props = {
  showDuplicate: boolean;
  imageSource: ImageSourcePropType | null;
};

export function ReceiptScanPreview({ showDuplicate, imageSource }: Props) {
  return (
    <>
      {showDuplicate ? (
        <View style={styles.duplicateBanner}>
          <Text style={styles.duplicateBannerTitle}>同じレシートかもしれません</Text>
          <Text style={styles.duplicateBannerText}>
            似た内容のレシートが登録されています。画像を比べて確認してください。
          </Text>
        </View>
      ) : null}

      {imageSource ? (
        <View style={styles.imageContainer}>
          <ReceiptImageViewer source={imageSource} style={styles.receiptImage} />
          <View style={styles.imageLabel}>
            <Text style={styles.imageLabelText}>加工済みプレビュー</Text>
          </View>
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  duplicateBanner: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.semantic.warning.bg,
    borderWidth: 1,
    borderColor: colors.semantic.warning.border,
  },
  duplicateBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.semantic.warning.text,
    marginBottom: 4,
  },
  duplicateBannerText: {
    fontSize: 13,
    color: colors.semantic.warning.text,
    lineHeight: 20,
  },
  imageContainer: {
    width: '100%',
    height: 260,
    backgroundColor: s.imageBg,
    marginBottom: spacing.md,
    position: 'relative',
  },
  receiptImage: { width: '100%', height: '100%' },
  imageLabel: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  imageLabelText: { color: c.text.inverse, fontSize: 10, fontWeight: 'bold' },
});
