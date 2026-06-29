import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppBackButton, AppButton } from '../components/ui';
import { ReceiptTrayPanel } from '../components/ReceiptTrayPanel';
import { useReceiptTray } from '../contexts/ReceiptTrayContext';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { screenLayout } from '../theme/screenLayout';

type Props = {
  onBack: () => void;
};

export function ReceiptTrayScreen({ onBack }: Props) {
  const {
    trayItems,
    trayItemCount,
    refreshing,
    refresh,
    openTrayItem,
    discardTrayItem,
    canOpenTrayItem,
    canDiscardTrayItem,
  } = useReceiptTray();

  /** 解析一覧表示のたびに 1 回取得（自動ポーリングはしない） */
  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh])
  );

  return (
    <SafeAreaView style={screenLayout.container} edges={['left', 'right', 'bottom']}>
      <View style={[screenLayout.header, styles.headerTray]}>
        <AppBackButton onPress={onBack} />
        <View style={styles.headerText}>
          <Text style={styles.title}>確認トレイ</Text>
          <Text style={styles.subtitle}>
            {trayItemCount > 0 ? `${trayItemCount} 件の受付` : '受付中のレシートはありません'}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <AppButton
            title="状態を更新"
            variant="outline"
            size="sm"
            loading={refreshing}
            onPress={() => void refresh({ userInitiated: true })}
          />
          {trayItemCount > 0 ? (
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{trayItemCount}</Text>
            </View>
          ) : null}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[screenLayout.scrollContent, styles.scrollContentTray]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void refresh({ userInitiated: true })}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        <ReceiptTrayPanel
          items={trayItems}
          showSectionHeaders
          onItemPress={(item) => void openTrayItem(item)}
          onItemDiscard={(item) => void discardTrayItem(item)}
          canOpenItem={canOpenTrayItem}
          canDiscardItem={canDiscardTrayItem}
          emptyTitle="確認待ちのレシートはありません"
          emptyDescription="ホームからレシートを撮影すると、解析状況がここに表示されます。"
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  headerTray: {
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
  },
  headerText: { flex: 1 },
  title: { ...typography.h1, color: colors.text.main, fontSize: 22 },
  subtitle: { ...typography.caption, color: colors.text.muted, marginTop: 2 },
  countBadge: {
    minWidth: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  countBadgeText: { color: colors.text.inverse, fontWeight: '700' },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  scrollContentTray: { paddingBottom: spacing.xl },
});
