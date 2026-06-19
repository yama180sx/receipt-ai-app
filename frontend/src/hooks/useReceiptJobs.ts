import { useCallback, useEffect, useRef, useState } from 'react';
import { receiptApi } from '../api/receiptApi';
import { countActiveReceiptJobs } from '../utils/receiptJobDisplay';
import type { ReceiptJobListItem } from '../types/receiptJob';

const POLL_INTERVAL_MS = 2000;

type RefreshOptions = {
  userInitiated?: boolean;
};

export function useReceiptJobs(enabled: boolean) {
  const [jobs, setJobs] = useState<ReceiptJobListItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const jobsRef = useRef(jobs);
  jobsRef.current = jobs;

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
        console.error('[ReceiptJobs] refresh failed:', error);
      } finally {
        if (userInitiated) setRefreshing(false);
      }
    },
    [enabled]
  );

  useEffect(() => {
    if (!enabled) {
      setJobs([]);
      return;
    }

    void refresh();
  }, [enabled, refresh]);

  useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(() => {
      if (countActiveReceiptJobs(jobsRef.current) > 0) {
        void refresh();
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [enabled, refresh]);

  const activeCount = countActiveReceiptJobs(jobs);

  return {
    jobs,
    activeCount,
    refreshing,
    refresh,
  };
}
