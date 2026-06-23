import { useCallback, useEffect, useState } from 'react';
import { Alert, Platform } from 'react-native';
import { productMasterApi, type ProductMaster } from '../../../api';
import { showAlert } from '../../../utils/alertMessage';
import { showApiErrorAlert } from '../../../utils/apiError';
import { showConfirmDialog } from '../../../utils/confirmDialog';

type UseProductMasterOptions = {
  currentMemberId: number | null;
};

export function useProductMaster({ currentMemberId }: UseProductMasterOptions) {
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
      void fetchMasters();
    }
  }, [fetchMasters, currentMemberId]);

  const handleDelete = useCallback(
    (id: number) => {
      showConfirmDialog('確認', 'この学習データを削除しますか？', [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: async () => {
            try {
              await productMasterApi.deleteProductMaster(id);
              await fetchMasters();
            } catch (err) {
              showApiErrorAlert('エラー', err, '削除に失敗しました。');
            }
          },
        },
      ]);
    },
    [fetchMasters]
  );

  const handleMergeStores = useCallback(() => {
    if (Platform.OS !== 'ios') {
      showAlert('通知', '店舗統合機能は現在iOSのみの対応です。');
      return;
    }

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
                      await fetchMasters();
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
  }, [fetchMasters]);

  return {
    masters,
    loading,
    searchQuery,
    setSearchQuery,
    storeFilter,
    setStoreFilter,
    handleDelete,
    handleMergeStores,
  };
}
