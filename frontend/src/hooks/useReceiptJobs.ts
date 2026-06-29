import { useCallback, useEffect, useState } from 'react';
import { receiptApi } from '../api/receiptApi';
import { showApiErrorAlert } from '../utils/apiError';
import { countActiveReceiptJobs } from '../utils/receiptJobDisplay';
import type { ReceiptJobListItem } from '../types/receiptJob';

type RefreshOptions = {
  userInitiated?: boolean;
};

/**
 * 確認トレイ用ジョブ一覧。
 * 自動ポーリングは行わず、呼び出し元が refresh のタイミングを制御する（Issue #106-0）。
 */
export function useReceiptJobs(enabled: boolean) {
  const [jobs, setJobs] = useState<ReceiptJobListItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(
    async (options?: RefreshOptions) => {
      if (!enabled) return;
      const userInitiated = options?.userInitiated ?? false;
      if (userInitiated) setRefreshing(true);
      try {
        const res = await receiptApi.listJobs();
        if (res.success && Array.isArray(res.data)) {
          setJobs(res.data as ReceiptJobListItem[]);
        }
      } catch (error) {
        if (userInitiated) {
          showApiErrorAlert('エラー', error, '解析ジョブ一覧の取得に失敗しました。');
        } else {
          console.error('[ReceiptJobs] refresh failed:', error);
        }
      } finally {
        if (userInitiated) setRefreshing(false);
      }
    },
    [enabled]
  );

  /** アプリ起動（Provider 有効化）時に 1 回取得 */
  useEffect(() => {
    if (!enabled) {
      setJobs([]);
      return;
    }

    void refresh();
  }, [enabled, refresh]);

  const activeCount = countActiveReceiptJobs(jobs);

  return {
    jobs,
    activeCount,
    refreshing,
    refresh,
  };
}
