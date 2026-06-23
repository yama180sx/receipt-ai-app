import React from 'react';
import { View, Text, StyleSheet, Image, ImageSourcePropType } from 'react-native';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';
import { borderRadius } from '../../../theme/radii';
import type { ReceiptScanInitialData } from '../../../types/receiptScan';

const c = colors;
const s = colors.semantic.scan;

type Props = {
  initialData: ReceiptScanInitialData;
  imageSource: ImageSourcePropType | null;
};

export function ReceiptScanPreview({ initialData, imageSource }: Props) {
  return (
    <>
      {initialData.duplicateSuspected ? (
        <View style={styles.duplicateBanner}>
          <Text style={styles.duplicateBannerTitle}>重複の疑い</Text>
          <Text style={styles.duplicateBannerText}>
            同じ店名・日付・金額のレシートが登録済みの可能性があります。
            {initialData.existingReceiptId
              ? `（既存レシート ID: ${initialData.existingReceiptId}）`
              : ''}
            {' '}内容を確認のうえ、問題なければ保存できます。
          </Text>
        </View>
      ) : null}

      {imageSource ? (
        <View style={styles.imageContainer}>
          <Image source={imageSource} style={styles.receiptImage} resizeMode="contain" />
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
