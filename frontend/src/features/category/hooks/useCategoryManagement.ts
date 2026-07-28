import { useCallback, useEffect, useState } from 'react';
import { categoryApi, type Category } from '../../../api';
import { getApiErrorStatus } from '../../../utils/apiError';
import { showAlert } from '../../../utils/alertMessage';
import { pickNextCategoryColor } from '../../../utils/categoryColor';
import { showConfirmDialog } from '../../../utils/confirmDialog';

type UseCategoryManagementOptions = {
  currentMemberId: number | null;
};

export function useCategoryManagement({ currentMemberId }: UseCategoryManagementOptions) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchCategories = useCallback(async () => {
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
  }, [currentMemberId]);

  useEffect(() => {
    if (currentMemberId) {
      void fetchCategories();
    }
  }, [currentMemberId, fetchCategories]);

  const addCategory = async () => {
    if (!newName.trim() || !currentMemberId) return;
    try {
      const color = pickNextCategoryColor(
        categories.map((c) => c.color).filter((c): c is string => !!c)
      );
      await categoryApi.createCategory({ name: newName, color });
      setNewName('');
      await fetchCategories();
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
            await fetchCategories();
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

  return {
    categories,
    newName,
    setNewName,
    loading,
    addCategory,
    deleteCategory,
  };
}
