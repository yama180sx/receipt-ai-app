import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, FlatList, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import apiClient from '../utils/apiClient'; // apiClient をインポート
import { theme } from '../theme';

interface Category {
  id: number;
  name: string;
  color: string;
}

// Props から API_BASE を削除
export const CategoryManagementScreen = ({ onBack }: { onBack: () => void }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { 
    fetchCategories(); 
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/categories');
      setCategories(res.data);
    } catch (e) {
      Alert.alert("エラー", "カテゴリーの取得に失敗しました。");
    } finally {
      setLoading(false);
    }
  };

  const addCategory = async () => {
    if (!newName.trim()) return;
    try {
      // apiClient を使用 (Content-Type 指定は不要)
      await apiClient.post('/categories', { 
        name: newName, 
        color: '#2ecc71' 
      });
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
            await apiClient.delete(`/categories/${id}`);
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

      {loading ? (
        <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={categories}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.list}
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
  container: { flex: 1, backgroundColor: theme.colors.background, padding: 20, paddingTop: 60 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 30 },
  backButton: { padding: 5 },
  backText: { color: theme.colors.primary, fontSize: 16, fontWeight: 'bold' },
  title: { ...theme.typography.h1, marginLeft: 15 },
  inputSection: { flexDirection: 'row', marginBottom: 25, gap: 10 },
  input: { flex: 1, backgroundColor: theme.colors.surface, borderRadius: 10, padding: 14, borderWidth: 1, borderColor: theme.colors.border, color: theme.colors.text.main },
  addButton: { backgroundColor: theme.colors.primary, paddingHorizontal: 25, justifyContent: 'center', borderRadius: 10, elevation: 2 },
  addButtonText: { color: 'white', fontWeight: 'bold' },
  list: { paddingBottom: 40 },
  itemRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surface, padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: theme.colors.border, elevation: 1 },
  colorBadge: { width: 14, height: 14, borderRadius: 7, marginRight: 15 },
  categoryName: { flex: 1, ...theme.typography.body, fontWeight: '600' },
  deleteButton: { padding: 8 },
  deleteText: { color: theme.colors.error, fontSize: 14, fontWeight: '700' }
});