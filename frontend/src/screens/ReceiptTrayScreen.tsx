import React, { useMemo } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppBackButton } from '../components/ui';
import { ReceiptTrayPanel } from '../components/ReceiptTrayPanel';
import { useReceiptTrayLocalFailures } from '../contexts/ReceiptTrayContext';
import { useReceiptJobs } from '../hooks/useReceiptJobs';
import { theme } from '../theme';
import { countReceiptTrayItems, sortReceiptTrayItems } from '../utils/receiptJobDisplay';

type Props = {
  onBack: () => void;
  enabled: boolean;
};

export function ReceiptTrayScreen({ onBack, enabled }: Props) {
  const { jobs, refreshing, refresh } = useReceiptJobs(enabled);
  const { localFailedJobs } = useReceiptTrayLocalFailures();

  const trayItems = useMemo(
    () => sortReceiptTrayItems([...jobs, ...localFailedJobs]),
    [jobs, localFailedJobs]
  );

  const totalCount = countReceiptTrayItems(trayItems);

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <View style={styles.header}>
        <AppBackButton onPress={onBack} />
        <View style={styles.headerText}>
          <Text style={styles.title}>確認トレイ</Text>
          <Text style={styles.subtitle}>
            {totalCount > 0 ? `${totalCount} 件の受付` : '受付中のレシートはありません'}
          </Text>
        </View>
        {totalCount > 0 ? (
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{totalCount}</Text>
          </View>
        ) : (
          <View style={styles.headerSpacer} />
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void refresh({ userInitiated: true })}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
      >
        <ReceiptTrayPanel
          items={trayItems}
          showSectionHeaders
          emptyTitle="確認待ちのレシートはありません"
          emptyDescription="ホームからレシートを撮影すると、解析状況がここに表示されます。"
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  headerText: { flex: 1 },
  title: { ...theme.typography.h1, color: theme.colors.text.main, fontSize: 22 },
  subtitle: { ...theme.typography.caption, color: theme.colors.text.muted, marginTop: 2 },
  countBadge: {
    minWidth: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  countBadgeText: { color: theme.colors.text.inverse, fontWeight: '700' },
  headerSpacer: { width: 32 },
  scrollContent: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
});
