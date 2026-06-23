import React from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Platform } from 'react-native';
import { AppBackButton, AppButton, AppListItem, AppTextInput } from '../components/ui';
import { useProductMaster } from '../features/productMaster';
import { BUTTON_LABELS } from '../constants/buttonLabels';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { screenLayout } from '../theme/screenLayout';

export const ProductMasterScreen = ({
  onBack,
  currentMemberId,
}: {
  onBack: () => void;
  currentMemberId: number | null;
}) => {
  const pm = useProductMaster({ currentMemberId });

  const renderItem = ({ item }: { item: (typeof pm.masters)[number] }) => (
    <AppListItem
      title={item.name}
      subtitle={`店舗: ${item.storeName || '共通'}`}
      right={
        <AppButton
          title={BUTTON_LABELS.delete}
          onPress={() => pm.handleDelete(item.id)}
          variant="dangerFilled"
          size="sm"
        />
      }
    >
      <View
        style={[
          styles.badge,
          { backgroundColor: item.category?.color || colors.semantic.placeholder.badge },
        ]}
      >
        <Text style={styles.badgeText}>{item.category?.name || '未分類'}</Text>
      </View>
    </AppListItem>
  );

  return (
    <View style={[screenLayout.container, styles.containerProduct]}>
      <View style={[screenLayout.header, styles.headerProduct]}>
        <AppBackButton onPress={onBack} />
        <Text style={[screenLayout.headerTitle, styles.titleProduct]}>
          学習マスタ ({currentMemberId === 1 ? '個人' : 'その他'})
        </Text>
        <AppButton title="店舗統合" onPress={pm.handleMergeStores} variant="ghost" size="sm" />
      </View>

      <View style={styles.searchBar}>
        <AppTextInput
          placeholder="品名検索..."
          style={styles.searchInput}
          value={pm.searchQuery}
          onChangeText={pm.setSearchQuery}
        />
        <AppTextInput
          placeholder="店舗名..."
          style={styles.searchInput}
          value={pm.storeFilter}
          onChangeText={pm.setStoreFilter}
        />
      </View>

      {!currentMemberId ? (
        <Text style={styles.empty}>メンバーを選択してください</Text>
      ) : pm.loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={pm.masters}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<Text style={styles.empty}>データがありません</Text>}
          initialNumToRender={15}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  containerProduct: { paddingTop: Platform.OS === 'ios' ? 60 : 20 },
  headerProduct: { paddingBottom: spacing.md },
  titleProduct: { flex: 1, textAlign: 'center' },
  searchBar: {
    padding: spacing.sm + 2,
    flexDirection: 'row',
    gap: spacing.sm + 2,
    backgroundColor: colors.surface,
  },
  searchInput: { flex: 1 },
  listContent: { paddingHorizontal: spacing.md, paddingBottom: 40 },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    marginTop: spacing.xs,
  },
  badgeText: { color: colors.text.inverse, fontSize: 11, fontWeight: 'bold' },
  empty: { textAlign: 'center', marginTop: 40, color: colors.text.muted },
});
