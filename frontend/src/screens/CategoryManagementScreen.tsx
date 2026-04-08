import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, FlatList, TextInput, TouchableOpacity, Alert, ActivityIndicator, Platform } from 'react-native';
import apiClient from '../utils/apiClient';
import { theme } from '../theme';

interface Category {
  id: number;
  name: string;
  color: string;
}

// [Issue #45] currentMemberId を Props に追加し、マルチテナントに対応
export const CategoryManagementScreen = ({ 
  onBack, 
  currentMemberId 
}: { 
  onBack: () => void, 
  currentMemberId: number | null 
}) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(true);
  const [optimizing, setOptimizing] = useState(false);

  /**
   * ヘッダー生成ヘルパー
   * バックエンドの tenantMiddleware で必要な ID を付与します
   */
  const getHeaders = useCallback(() => {
    return currentMemberId ? { 'x-member-id': currentMemberId.toString() } : {};
  }, [currentMemberId]);

  useEffect(() => { 
    if (currentMemberId) fetchCategories(); 
  }, [currentMemberId]);

  const fetchCategories = async () => {
    if (!currentMemberId) return;
    setLoading(true);
    try {
      const res = await apiClient.get('/categories', { headers: getHeaders() });
      if (res.data && res.data.success) {
        setCategories(res.data.data || []);
      }
    } catch (e) {
      console.error(e);
      Alert.alert("エラー", "カテゴリーの取得に失敗しました。");
    } finally {
      setLoading(false);
    }
  };

  const addCategory = async () => {
    if (!newName.trim() || !currentMemberId) return;
    try {
      await apiClient.post('/categories', 
        { name: newName, color: '#2ecc71' },
        { headers: getHeaders() }
      );
      setNewName('');
      fetchCategories();
    } catch (e) {
      Alert.alert("エラー", "追加に失敗しました。");
    }
  };

  const deleteCategory = async (id: number) => {
    Alert.alert("削除の確認", "このカテゴリーを削除しますか？", [
      { text: "キャンセル" },
      { text: "削除", style: 'destructive', onPress: async () => {
          try {
            await apiClient.delete(`/categories/${id}`, { headers: getHeaders() });
            fetchCategories();
          } catch (e: any) {
            if (e.response?.status === 400 || e.response?.status === 409) {
              Alert.alert("制限", "このカテゴリーは既に使用されているため削除できません。");
            } else {
              Alert.alert("エラー", "削除に失敗しました。");
            }
          }
      }}
    ]);
  };

  /**
   * [Issue #48] カテゴリーキーワードの統計的最適化を実行
   * ProductMaster の学習データからキーワードを自動生成します
   */
  const handleOptimize = async () => {
    Alert.alert(
      "マスタ最適化",
      "ProductMasterの統計に基づき、カテゴリーのキーワードを自動補強します。よろしいですか？",
      [
        { text: "キャンセル", style: "cancel" },
        { 
          text: "実行", 
          onPress: async () => {
            setOptimizing(true);
            try {
              const res = await apiClient.post('/categories/optimize', {}, { headers: getHeaders() });
              if (res.data.success) {
                Alert.alert("完了", res.data.data.message);
                fetchCategories();
              }
            } catch (e) {
              console.error(e);
              Alert.alert("エラー", "最適化処理に失敗しました。");
            } finally {
              setOptimizing(false);
            }
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>← 戻る</Text>
        </TouchableOpacity>
        <Text style={styles.title}>カテゴリー設定</Text>
      </View>

      <View style={styles.inputSection}>
        <TextInput 
          style={styles.input} 
          value={newName} 
          onChangeText={setNewName} 
          placeholder="新しいカテゴリー（例: 趣味）"
          placeholderTextColor={theme.colors.text.muted}
        />
        <TouchableOpacity style={styles.addButton} onPress={addCategory}>
          <Text style={styles.addButtonText}>追加</Text>
        </TouchableOpacity>
      </View>

      {/* [Issue #48] 最適化アクションボタン */}
      <TouchableOpacity 
        style={[styles.optimizeButton, optimizing && styles.buttonDisabled]} 
        onPress={handleOptimize}
        disabled={optimizing}
      >
        {optimizing ? (
          <ActivityIndicator size="small" color="white" />
        ) : (
          <Text style={styles.optimizeButtonText}>🪄 カテゴリーキーワードを自動最適化</Text>
        )}
      </TouchableOpacity>

      {!currentMemberId ? (
        <Text style={styles.emptyText}>メンバーを選択してください</Text>
      ) : loading ? (
        <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={categories}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.emptyText}>登録されているカテゴリーはありません</Text>}
          renderItem={({ item }) => (
            <View style={styles.itemRow}>
              <View style={[styles.colorBadge, { backgroundColor: item.color }]} />
              <Text style={styles.categoryName}>{item.name}</Text>
              <TouchableOpacity onPress={() => deleteCategory(item.id)} style={styles.deleteButton}>
                <Text style={styles.deleteText}>削除</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, padding: 20, paddingTop: Platform.OS === 'ios' ? 60 : 20 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 30 },
  backButton: { padding: 5 },
  backText: { color: theme.colors.primary, fontSize: 16, fontWeight: 'bold' },
  title: { ...theme.typography.h1, marginLeft: 15 },
  inputSection: { flexDirection: 'row', marginBottom: 15, gap: 10 },
  input: { flex: 1, backgroundColor: theme.colors.surface, borderRadius: 10, padding: 14, borderWidth: 1, borderColor: theme.colors.border, color: theme.colors.text.main },
  addButton: { backgroundColor: theme.colors.primary, paddingHorizontal: 25, justifyContent: 'center', borderRadius: 10, elevation: 2 },
  addButtonText: { color: 'white', fontWeight: 'bold' },
  
  optimizeButton: { 
    backgroundColor: theme.colors.secondary || '#6c5ce7', 
    padding: 12, 
    borderRadius: 10, 
    marginBottom: 20, 
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    elevation: 1
  },
  optimizeButtonText: { color: 'white', fontWeight: 'bold', fontSize: 14 },
  buttonDisabled: { opacity: 0.6 },

  list: { paddingBottom: 40 },
  itemRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surface, padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: theme.colors.border, elevation: 1 },
  colorBadge: { width: 14, height: 14, borderRadius: 7, marginRight: 15 },
  categoryName: { flex: 1, ...theme.typography.body, fontWeight: '600' },
  deleteButton: { padding: 8 },
  deleteText: { color: theme.colors.error, fontSize: 14, fontWeight: '700' },
  emptyText: { textAlign: 'center', marginTop: 30, color: theme.colors.text.muted }
});