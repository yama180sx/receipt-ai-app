import React, { useEffect } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppBackButton } from '../components/ui';
import { useAppSessionContext } from '../features/app/contexts/AppSessionContext';
import { ManualReceiptForm, useManualReceipt } from '../features/manualReceipt';
import { colors } from '../theme/colors';
import { screenLayout } from '../theme/screenLayout';
import { showAlert } from '../utils/alertMessage';

type Props = { onBack: () => void; onDenied: () => void };

export function ManualReceiptScreen({ onBack, onDenied }: Props) {
  const { currentUserRole } = useAppSessionContext();
  const form = useManualReceipt(onBack);
  const isAdmin = currentUserRole === 'ADMIN';

  useEffect(() => {
    if (!isAdmin) {
      showAlert('管理者限定', '手入力レシート登録は管理者のみ利用できます。');
      onDenied();
    }
  }, [isAdmin, onDenied]);

  if (!isAdmin || form.isLoading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  return (
    <View style={screenLayout.container}>
      <View style={screenLayout.header}>
        <AppBackButton onPress={onBack} />
        <Text style={screenLayout.headerTitle}>手動レシート登録</Text>
        <View style={styles.headerSpacer} />
      </View>
      <ScrollView contentContainerStyle={screenLayout.scrollContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.description}>AI解析を使わず、選択した世帯メンバーのレシートを手入力で登録します。</Text>
        <ManualReceiptForm form={form} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerSpacer: { width: 60 },
  description: { color: colors.text.muted, lineHeight: 20, marginHorizontal: 16, marginVertical: 16 },
});
