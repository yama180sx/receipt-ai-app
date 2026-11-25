import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AppBackButton, AppButton } from '../../../components/ui';
import { colors } from '../../../theme/colors';
import { screenLayout } from '../../../theme/screenLayout';
import type { ReceiptScanFlow } from '../hooks/useReceiptScan';

const c = colors;
const s = colors.semantic.scan;

type Props = {
  onCancel: () => void;
  scan: ReceiptScanFlow;
};

export function ReceiptScanHeader({ onCancel, scan }: Props) {
  return (
    <View style={[screenLayout.header, styles.headerScan]}>
      <AppBackButton onPress={onCancel} style={styles.headerBack} />
      <Text style={[screenLayout.headerTitle, styles.headerTitleScan]}>解析結果の確認</Text>
      <AppButton
        title={scan.lookupPending ? '確認中' : scan.submitLabel}
        onPress={scan.handleSubmit}
        loading={scan.loading}
        disabled={scan.loading || scan.lookupPending}
        size="sm"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  headerScan: { backgroundColor: c.surface, borderBottomColor: s.borderLight },
  headerTitleScan: { fontSize: 17, color: s.textTitle },
  headerBack: { minWidth: 50 },
});
