import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, FlatList, ActivityIndicator, Platform } from 'react-native';
import { categoryApi, type Category } from '../api';
import { getApiErrorStatus } from '../utils/apiError';
import { showAlert } from '../utils/alertMessage';
import { AppBackButton, AppButton, AppListColorDot, AppListItem, AppTextInput } from '../components/ui';
import { BUTTON_LABELS } from '../constants/buttonLabels';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { cardStyles } from '../theme/cardStyles';
import { screenLayout } from '../theme/screenLayout';
import { pickNextCategoryColor } from '../utils/categoryColor';
import { showConfirmDialog } from '../utils/confirmDialog';

export const CategoryManagementScreen = ({
  onBack,
  currentMemberId,
}: {
  onBack: () => void;
  currentMemberId: number | null;
}) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(true);
  const [optimizing, setOptimizing] = useState(false);

  useEffect(() => {
    if (currentMemberId) fetchCategories();
  }, [currentMemberId]);

  const fetchCategories = async () => {
    if (!currentMemberId) return;
    setLoading(true);
    try {
      const res = await categoryApi.listCategories();
      setCategories(res.data ?? []);
    } catch (e: unknown) {
      if (getApiErrorStatus(e) === 401) {
        showAlert('セッション切れ', '再度ログインしてください。');
      } else {
        showAlert('エラー', 'カテゴリーの取得に失敗しました。');
      }
    } finally {
      setLoading(false);
    }
  };

  const addCategory = async () => {
    if (!newName.trim() || !currentMemberId) return;
    try {
      const color = pickNextCategoryColor(
        categories.map((c) => c.color).filter((c): c is string => !!c)
      );
      await categoryApi.createCategory({ name: newName, color });
      setNewName('');
      fetchCategories();
    } catch {
      showAlert('エラー', '追加に失敗しました。');
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
            await categoryApi.deleteCategory(id);
            fetchCategories();
          } catch (e: unknown) {
            const status = getApiErrorStatus(e);
            if (status === 400 || status === 409) {
              showAlert('制限', 'このカテゴリーは既に使用されているため削除できません。');
            } else {
              showAlert('エラー', '削除に失敗しました。');
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
              const res = await categoryApi.optimizeCategories();
              showAlert('完了', res.data?.message ?? '最適化が完了しました。');
              fetchCategories();
            } catch {
              showAlert('エラー', '最適化処理に失敗しました。');
            } finally {
              setOptimizing(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={[screenLayout.container, styles.containerCategory]}>
      <View style={[screenLayout.header, styles.headerCategory]}>
        <AppBackButton onPress={onBack} />
        <Text style={[typography.h1, styles.titleCategory]}>カテゴリー設定</Text>
      </View>

      <View style={[cardStyles.section, styles.inputSection]}>
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
        style={{ backgroundColor: colors.semantic.category.optimize, marginBottom: spacing.lg }}
      />

      {!currentMemberId ? (
        <Text style={styles.emptyText}>メンバーを選択してください</Text>
      ) : loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={categories}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <AppListItem
              title={item.name}
              left={<AppListColorDot color={item.color ?? colors.semantic.placeholder.badge} />}
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
  containerCategory: {
    padding: spacing.lg,
    paddingTop: Platform.OS === 'ios' ? 60 : spacing.lg,
  },
  headerCategory: { borderBottomWidth: 0, marginBottom: spacing.lg, paddingHorizontal: 0, paddingVertical: 0 },
  titleCategory: { marginLeft: spacing.sm, flex: 1, color: colors.text.main },
  inputSection: { flexDirection: 'row', marginBottom: spacing.md, gap: spacing.sm + 2, alignItems: 'center' },
  nameInput: { flex: 1 },
  list: { paddingBottom: 40 },
  emptyText: { textAlign: 'center', marginTop: 30, color: colors.text.muted },
});
