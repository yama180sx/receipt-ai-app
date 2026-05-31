import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, FlatList, Alert, ActivityIndicator, Platform } from 'react-native';
import apiClient from '../utils/apiClient';
import { AppBackButton, AppButton, AppListColorDot, AppListItem, AppTextInput } from '../components/ui';
import { BUTTON_LABELS } from '../constants/buttonLabels';
import { theme } from '../theme';
import { pickNextCategoryColor } from '../utils/categoryColor';
import { showConfirmDialog } from '../utils/confirmDialog';

interface Category {
  id: number;
  name: string;
  color: string;
}

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
   * [Issue #51 & #52] 
   * バックエンドが JWT 認証（Bearer Token）を優先するように修正されたため、
   * 手動の x-member-id 付与は「移行期間用」として最小限に留めます。
   * ※Issue #52 完了後は、このヘルパー自体を削除し apiClient に任せます。
   */
  const getHeaders = () => (currentMemberId ? { 'x-member-id': currentMemberId.toString() } : {});

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
    } catch (e: any) {
      if (e.response?.status === 401) {
        Alert.alert("セッション切れ", "再度ログインしてください。");
      } else {
        Alert.alert("エラー", "カテゴリーの取得に失敗しました。");
      }
    } finally {
      setLoading(false);
    }
  };

  const addCategory = async () => {
    if (!newName.trim() || !currentMemberId) return;
    try {
      const color = pickNextCategoryColor(categories.map((c) => c.color));
      await apiClient.post(
        '/categories',
        { name: newName, color },
        { headers: getHeaders() }
      );
      setNewName('');
      fetchCategories();
    } catch (e) {
      Alert.alert("エラー", "追加に失敗しました。");
    }
  };

  const deleteCategory = (id: number) => {
    showConfirmDialog('削除の確認', 'このカテゴリーを削除しますか？', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiClient.delete(`/categories/${id}`, { headers: getHeaders() });
            fetchCategories();
          } catch (e: any) {
            const status = e.response?.status;
            if (status === 400 || status === 409) {
              Alert.alert('制限', 'このカテゴリーは既に使用されているため削除できません。');
            } else {
              Alert.alert('エラー', '削除に失敗しました。');
            }
          }
        },
      },
    ]);
  };

  const handleOptimize = () => {
    showConfirmDialog(
      'マスタ最適化',
      'ProductMasterの統計に基づき、カテゴリーのキーワードを自動補強します。よろしいですか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '実行',
          onPress: async () => {
            setOptimizing(true);
            try {
              const res = await apiClient.post('/categories/optimize', {}, { headers: getHeaders() });
              if (res.data.success) {
                Alert.alert('完了', res.data.data.message);
                fetchCategories();
              }
            } catch (e) {
              Alert.alert('エラー', '最適化処理に失敗しました。');
            } finally {
              setOptimizing(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <AppBackButton onPress={onBack} />
        <Text style={styles.title}>カテゴリー設定</Text>
      </View>

      <View style={styles.inputSection}>
        <AppTextInput
          style={styles.nameInput}
          value={newName}
          onChangeText={setNewName}
          placeholder="新しいカテゴリー"
        />
        <AppButton title={BUTTON_LABELS.add} onPress={addCategory} size="md" />
      </View>

      <AppButton
        title="🪄 キーワード自動最適化"
        onPress={handleOptimize}
        loading={optimizing}
        disabled={optimizing}
        fullWidth
        size="md"
        style={{ backgroundColor: theme.colors.semantic.category.optimize, marginBottom: 20 }}
      />

      {!currentMemberId ? (
        <Text style={styles.emptyText}>メンバーを選択してください</Text>
      ) : loading ? (
        <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={categories}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <AppListItem
              title={item.name}
              left={<AppListColorDot color={item.color} />}
              right={
                <AppButton
                  title={BUTTON_LABELS.delete}
                  onPress={() => deleteCategory(item.id)}
                  variant="dangerFilled"
                  size="sm"
                />
              }
            />
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, padding: 20, paddingTop: Platform.OS === 'ios' ? 60 : 20 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 30 },
  title: { ...theme.typography.h1, marginLeft: 8, flex: 1 },
  inputSection: { flexDirection: 'row', marginBottom: 15, gap: 10, alignItems: 'center' },
  nameInput: { flex: 1 },
  list: { paddingBottom: 40 },
  emptyText: { textAlign: 'center', marginTop: 30, color: theme.colors.text.muted },
});