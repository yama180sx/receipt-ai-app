import { useCallback, useEffect, useRef, useState } from 'react';
import apiClient from '../utils/apiClient';
import { countActiveReceiptJobs } from '../utils/receiptJobDisplay';
import type { ReceiptJobListItem } from '../types/receiptJob';

const POLL_INTERVAL_MS = 2000;

export function useReceiptJobs(enabled: boolean) {
  const [jobs, setJobs] = useState<ReceiptJobListItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const jobsRef = useRef(jobs);
  jobsRef.current = jobs;

  const refresh = useCallback(async () => {
    if (!enabled) return;
    setRefreshing(true);
    try {
      const res = await apiClient.get('/receipts/jobs');
      if (res.data?.success && Array.isArray(res.data.data)) {
        setJobs(res.data.data as ReceiptJobListItem[]);
      }
    } catch (error) {
      console.error('[ReceiptJobs] refresh failed:', error);
    } finally {
      setRefreshing(false);
    }
  }, [enabled]);

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
