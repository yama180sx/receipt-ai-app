import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Alert, ActivityIndicator, Platform } from 'react-native';
import { productMasterApi, type ProductMaster } from '../api';
import { AppBackButton, AppButton, AppListItem, AppTextInput } from '../components/ui';
import { BUTTON_LABELS } from '../constants/buttonLabels';
import { theme } from '../theme';

export const ProductMasterScreen = ({
  onBack,
  currentMemberId
}: {
  onBack: () => void,
  currentMemberId: number | null
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
      console.error('Fetch Masters Error:', err);
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
    Alert.alert('確認', 'この学習データを削除しますか？', [
      { text: 'キャンセル', style: 'cancel' },
      { text: '削除', style: 'destructive', onPress: async () => {
        try {
          await productMasterApi.deleteProductMaster(id);
          fetchMasters();
        } catch (e) {
          Alert.alert('エラー', '削除に失敗しました');
        }
      }}
    ]);
  };

  const handleMergeStores = () => {
    if (Platform.OS === 'ios') {
      Alert.prompt(
        "店舗名の統合",
        "統合元の店舗名を入力（例: ｾﾌﾞﾝ）",
        [
          { text: "キャンセル", style: "cancel" },
          { text: "次へ", onPress: (source: string | undefined) => {
            if (!source) return;
            Alert.prompt(
              "統合先名称",
              `${source} をどの名称に統合しますか？`,
              [
                { text: "実行", onPress: async (target: string | undefined) => {
                  if (!target) return;
                  try {
                    await productMasterApi.mergeStoreNames({
                      sourceStoreName: source,
                      targetStoreName: target,
                    });
                    Alert.alert("完了", "統合完了しました");
                    fetchMasters();
                  } catch (e) {
                    Alert.alert("エラー", "統合失敗");
                  }
                }}
              ]
            );
          }}
        ]
      );
    } else {
      Alert.alert("通知", "店舗統合機能は現在iOSのみの対応です。");
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
          { backgroundColor: item.category?.color || theme.colors.semantic.placeholder.badge },
        ]}
      >
        <Text style={styles.badgeText}>{item.category?.name || '未分類'}</Text>
      </View>
    </AppListItem>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <AppBackButton onPress={onBack} />
        <Text style={styles.title}>学習マスタ ({currentMemberId === 1 ? '個人' : 'その他'})</Text>
        <AppButton
          title="店舗統合"
          onPress={handleMergeStores}
          variant="ghost"
          size="sm"
        />
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
        <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 20 }} />
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
  container: { flex: 1, backgroundColor: theme.colors.background, paddingTop: Platform.OS === 'ios' ? 60 : 20 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 15,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border
  },
  title: { fontSize: 18, fontWeight: 'bold', color: theme.colors.text.main, flex: 1, textAlign: 'center' },
  searchBar: { padding: 10, flexDirection: 'row', gap: 10, backgroundColor: theme.colors.surface },
  searchInput: { flex: 1 },
  listContent: { paddingHorizontal: 15, paddingBottom: 40 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12, marginTop: 4 },
  badgeText: { color: theme.colors.text.inverse, fontSize: 11, fontWeight: 'bold' },
  empty: { textAlign: 'center', marginTop: 40, color: theme.colors.text.muted }
});
