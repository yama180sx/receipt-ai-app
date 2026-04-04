import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, Alert, ActivityIndicator, Modal, Platform } from 'react-native';
import apiClient from '../utils/apiClient';
import { theme } from '../theme';

interface ProductMaster {
  id: number;
  name: string;
  storeName: string;
  categoryId: number;
  category?: { name: string; color: string };
  updatedAt: string;
}

interface Category {
  id: number;
  name: string;
  color: string;
}

export const ProductMasterScreen = ({ onBack }: { onBack: () => void }) => {
  const [masters, setMasters] = useState<ProductMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [storeFilter, setStoreFilter] = useState('');
  
  const [categories, setCategories] = useState<Category[]>([]);

  const fetchMasters = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/product-master', {
        params: { q: searchQuery, store: storeFilter }
      });
      setMasters(res.data);
    } catch (err) {
      console.error(err);
      Alert.alert('エラー', 'マスタの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, storeFilter]);

  useEffect(() => {
    fetchMasters();
    apiClient.get('/categories').then(res => setCategories(res.data));
  }, [fetchMasters]);

  const handleDelete = (id: number) => {
    Alert.alert('確認', 'この学習データを削除しますか？', [
      { text: 'キャンセル', style: 'cancel' },
      { text: '削除', style: 'destructive', onPress: async () => {
        try {
          await apiClient.delete(`/product-master/${id}`);
          fetchMasters();
        } catch (e) {
          Alert.alert('エラー', '削除に失敗しました');
        }
      }}
    ]);
  };

  const handleMergeStores = () => {
    // React NativeのAlert.promptはiOSのみ対応です
    // Androidでも動かす場合はModalで自作が必要ですが、まずは簡易実装にします
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
                    await apiClient.post('/product-master/merge-stores', {
                      sourceStoreName: source,
                      targetStoreName: target
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
      Alert.alert("通知", "店舗統合機能（Prompt）は現在iOSのみの簡易実装です。");
    }
  };

  const renderItem = ({ item }: { item: ProductMaster }) => (
    <View style={styles.card}>
      <View style={styles.cardInfo}>
        <Text style={styles.itemName}>{item.name}</Text>
        <Text style={styles.storeName}>店舗: {item.storeName}</Text>
        <View style={[styles.badge, { backgroundColor: item.category?.color || '#ccc' }]}>
          <Text style={styles.badgeText}>{item.category?.name || '未分類'}</Text>
        </View>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.deleteBtn}>
          <Text style={styles.btnText}>削除</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} hitSlop={{top:10, bottom:10, left:10, right:10}}>
          <Text style={styles.backText}>← 戻る</Text>
        </TouchableOpacity>
        <Text style={styles.title}>学習マスタ管理</Text>
        <TouchableOpacity onPress={handleMergeStores}>
          <Text style={styles.mergeText}>店舗統合</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchBar}>
        <TextInput 
          placeholder="品名検索..." 
          style={styles.input} 
          value={searchQuery} 
          onChangeText={setSearchQuery} 
          clearButtonMode="while-editing"
        />
        <TextInput 
          placeholder="店舗名..." 
          style={styles.input} 
          value={storeFilter} 
          onChangeText={setStoreFilter} 
          clearButtonMode="while-editing"
        />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={masters}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 40 }}
          ListEmptyComponent={<Text style={styles.empty}>データがありません</Text>}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, paddingTop: Platform.OS === 'ios' ? 60 : 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 15, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  backText: { color: theme.colors.primary, fontWeight: 'bold', fontSize: 16 },
  title: { fontSize: 18, fontWeight: 'bold', color: theme.colors.text.main },
  mergeText: { color: theme.colors.secondary, fontWeight: 'bold' },
  searchBar: { padding: 10, flexDirection: 'row', backgroundColor: theme.colors.surface },
  input: { flex: 1, backgroundColor: '#fff', marginHorizontal: 5, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: theme.colors.border },
  card: { backgroundColor: '#fff', marginHorizontal: 15, marginTop: 10, padding: 15, borderRadius: 10, flexDirection: 'row', justifyContent: 'space-between', borderWidth: 1, borderColor: theme.colors.border },
  cardInfo: { flex: 1 },
  itemName: { fontWeight: 'bold', fontSize: 16, color: theme.colors.text.main },
  storeName: { color: theme.colors.text.muted, fontSize: 13, marginVertical: 4 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  actions: { justifyContent: 'center', paddingLeft: 10 },
  deleteBtn: { backgroundColor: theme.colors.error, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6 },
  btnText: { color: '#fff', fontSize: 12, fontWeight: 'bold', textAlign: 'center' },
  empty: { textAlign: 'center', marginTop: 40, color: theme.colors.text.muted }
});