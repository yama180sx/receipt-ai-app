import React from 'react';
import { StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ReceiptScanForm,
  ReceiptScanHeader,
  ReceiptScanItemList,
  ReceiptScanPreview,
  useReceiptScan,
} from '../features/receipt';
import { colors } from '../theme/colors';
import { screenLayout } from '../theme/screenLayout';
import type { ReceiptScanInitialData } from '../types/receiptScan';

const s = colors.semantic.scan;

interface ReceiptScanScreenProps {
  initialData: ReceiptScanInitialData;
  categories: Array<{ id: number; name: string }>;
  onSuccess: () => void;
  onCancel: () => void;
}

/**
 * [Issue #67 / #71 / #100-14 / #104-2] レシート解析結果の確認・編集画面 — Hook + UI
 */
export const ReceiptScanScreen: React.FC<ReceiptScanScreenProps> = ({
  initialData,
  categories,
  onSuccess,
  onCancel,
}) => {
  const scan = useReceiptScan({ initialData, categories, onSuccess, onCancel });

  return (
    <SafeAreaView style={[screenLayout.container, styles.containerScan]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ReceiptScanHeader onCancel={onCancel} scan={scan} />
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <ReceiptScanPreview initialData={initialData} imageSource={scan.imageSource} />
          <ReceiptScanForm scan={scan} />
          <ReceiptScanItemList scan={scan} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  containerScan: { backgroundColor: s.background },
  scrollView: { flex: 1 },
});
