import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Alert, ActivityIndicator, Platform } from 'react-native';
import { productMasterApi, type ProductMaster } from '../api';
import { showAlert } from '../utils/alertMessage';
import { showApiErrorAlert } from '../utils/apiError';
import { showConfirmDialog } from '../utils/confirmDialog';
import { AppBackButton, AppButton, AppListItem, AppTextInput } from '../components/ui';
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
  const [masters, setMasters] = useState<ProductMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [storeFilter, setStoreFilter] = useState('');

  const fetchMasters = useCallback(async () => {
    if (!currentMemberId) return;

    try {
      setLoading(true);
      const res = await productMasterApi.listProductMasters({
        q: searchQuery,
        store: storeFilter,
      });
      setMasters(res.data ?? []);
    } catch (err) {
      showApiErrorAlert('エラー', err, '学習マスタの取得に失敗しました。');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, storeFilter, currentMemberId]);

  useEffect(() => {
    if (currentMemberId) {
      fetchMasters();
    }
  }, [fetchMasters, currentMemberId]);

  const handleDelete = (id: number) => {
    showConfirmDialog('確認', 'この学習データを削除しますか？', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除',
        style: 'destructive',
        onPress: async () => {
          try {
            await productMasterApi.deleteProductMaster(id);
            fetchMasters();
          } catch (err) {
            showApiErrorAlert('エラー', err, '削除に失敗しました。');
          }
        },
      },
    ]);
  };

  const handleMergeStores = () => {
    if (Platform.OS === 'ios') {
      Alert.prompt(
        '店舗名の統合',
        '統合元の店舗名を入力（例: ｾﾌﾞﾝ）',
        [
          { text: 'キャンセル', style: 'cancel' },
          {
            text: '次へ',
            onPress: (source: string | undefined) => {
              if (!source) return;
              Alert.prompt(
                '統合先名称',
                `${source} をどの名称に統合しますか？`,
                [
                  {
                    text: '実行',
                    onPress: async (target: string | undefined) => {
                      if (!target) return;
                      try {
                        await productMasterApi.mergeStoreNames({
                          sourceStoreName: source,
                          targetStoreName: target,
                        });
                        showAlert('完了', '統合完了しました');
                        fetchMasters();
                      } catch (err) {
                        showApiErrorAlert('エラー', err, '統合に失敗しました。');
                      }
                    },
                  },
                ]
              );
            },
          },
        ]
      );
    } else {
      showAlert('通知', '店舗統合機能は現在iOSのみの対応です。');
    }
  };

  const renderItem = ({ item }: { item: ProductMaster }) => (
    <AppListItem
      title={item.name}
      subtitle={`店舗: ${item.storeName || '共通'}`}
      right={
        <AppButton
          title={BUTTON_LABELS.delete}
          onPress={() => handleDelete(item.id)}
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
        <AppButton title="店舗統合" onPress={handleMergeStores} variant="ghost" size="sm" />
      </View>

      <View style={styles.searchBar}>
        <AppTextInput
          placeholder="品名検索..."
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <AppTextInput
          placeholder="店舗名..."
          style={styles.searchInput}
          value={storeFilter}
          onChangeText={setStoreFilter}
        />
      </View>

      {!currentMemberId ? (
        <Text style={styles.empty}>メンバーを選択してください</Text>
      ) : loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={masters}
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
