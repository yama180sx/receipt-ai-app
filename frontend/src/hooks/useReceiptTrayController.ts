import { useCallback, useEffect, useMemo, useState } from 'react';
import { useReceiptJobs } from './useReceiptJobs';
import type { ReceiptScanInitialData } from '../types/receiptScan';
import type { LocalFailedReceiptJob, ReceiptJobListItem, ReceiptTrayItem } from '../types/receiptJob';
import { showAlert } from '../utils/alertMessage';
import { showConfirmDialog } from '../utils/confirmDialog';
import { discardReceiptJob, fetchReceiptScanInitialData } from '../utils/receiptJobActions';
import {
  countReceiptTrayItems,
  resolveReceiptTrayItemDisplay,
  sortReceiptTrayItems,
} from '../utils/receiptJobDisplay';

export type ReceiptTrayContextValue = {
  jobs: ReceiptJobListItem[];
  activeCount: number;
  refreshing: boolean;
  refresh: (options?: { userInitiated?: boolean }) => Promise<void>;
  trayItems: ReceiptTrayItem[];
  trayItemCount: number;
  localFailedJobs: LocalFailedReceiptJob[];
  addLocalFailedJob: (reason: string) => void;
  openTrayItem: (item: ReceiptTrayItem) => Promise<void>;
  discardTrayItem: (item: ReceiptTrayItem) => Promise<void>;
  canOpenTrayItem: (item: ReceiptTrayItem) => boolean;
  canDiscardTrayItem: (item: ReceiptTrayItem) => boolean;
};

type UseReceiptTrayControllerOptions = {
  enabled: boolean;
  onOpenScan: (data: ReceiptScanInitialData) => void;
  onRegisterRefresh?: (refresh: () => Promise<void>) => void;
};

export function useReceiptTrayController({
  enabled,
  onOpenScan,
  onRegisterRefresh,
}: UseReceiptTrayControllerOptions): ReceiptTrayContextValue {
  const { jobs, activeCount, refreshing, refresh } = useReceiptJobs(enabled);
  const [localFailedJobs, setLocalFailedJobs] = useState<LocalFailedReceiptJob[]>([]);

  const addLocalFailedJob = useCallback((reason: string) => {
    setLocalFailedJobs((prev) => [
      {
        id: `local-failed-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        state: 'failed',
        createdAt: Date.now(),
        failedReason: reason,
        localOnly: true,
      },
      ...prev,
    ]);
  }, []);

  const trayItems = useMemo(
    () => sortReceiptTrayItems([...jobs, ...localFailedJobs]),
    [jobs, localFailedJobs]
  );

  const trayItemCount = countReceiptTrayItems(trayItems);

  useEffect(() => {
    onRegisterRefresh?.((options) => refresh(options));
  }, [onRegisterRefresh, refresh]);

  const canOpenTrayItem = useCallback((item: ReceiptTrayItem): boolean => {
    if ('localOnly' in item && item.localOnly) return false;
    const display = resolveReceiptTrayItemDisplay(item);
    return !display.isActive && display.kind !== 'failed';
  }, []);

  const canDiscardTrayItem = useCallback((_item: ReceiptTrayItem): boolean => true, []);

  const proceedOpenTrayItem = useCallback(
    async (item: ReceiptJobListItem) => {
      const scanData = await fetchReceiptScanInitialData(item.id);
      if (!scanData) {
        showAlert('利用できません', '解析結果を取得できませんでした。一覧を更新して再度お試しください。');
        await refresh();
        return;
      }

      onOpenScan({
        ...scanData,
        duplicateSuspected: scanData.duplicateSuspected ?? item.duplicateSuspected,
        existingReceiptId: scanData.existingReceiptId ?? item.existingReceiptId ?? null,
        warnedDuplicateFromTray: Boolean(scanData.duplicateSuspected ?? item.duplicateSuspected),
      });
    },
    [onOpenScan, refresh]
  );

  const openTrayItem = useCallback(
    async (item: ReceiptTrayItem) => {
      if ('localOnly' in item && item.localOnly) return;

      const display = resolveReceiptTrayItemDisplay(item);
      if (display.isActive) {
        showAlert('解析中', '解析が完了するまでお待ちください。');
        return;
      }

      if (display.kind === 'failed') {
        showAlert('解析失敗', item.failedReason || 'このレシートは確認できません。破棄して再度撮影してください。');
        return;
      }

      if (item.duplicateSuspected) {
        showConfirmDialog(
          '重複の疑い',
          '同じ店名・日付・金額のレシートが既に登録されている可能性があります。内容を確認しますか？',
          [
            { text: 'キャンセル', style: 'cancel' },
            {
              text: '確認する',
              onPress: () => proceedOpenTrayItem(item),
            },
          ]
        );
        return;
      }

      await proceedOpenTrayItem(item);
    },
    [proceedOpenTrayItem]
  );

  const discardTrayItem = useCallback(
    async (item: ReceiptTrayItem) => {
      const runDiscard = async () => {
        if ('localOnly' in item && item.localOnly) {
          setLocalFailedJobs((prev) => prev.filter((job) => job.id !== item.id));
          return;
        }

        await discardReceiptJob(item.id);
        await refresh();
      };

      showConfirmDialog('破棄の確認', 'この受付項目を破棄しますか？', [
        { text: 'キャンセル', style: 'cancel' },
        { text: '破棄', style: 'destructive', onPress: runDiscard },
      ]);
    },
    [refresh]
  );

  return {
    jobs,
    activeCount,
    refreshing,
    refresh,
    trayItems,
    trayItemCount,
    localFailedJobs,
    addLocalFailedJob,
    openTrayItem,
    discardTrayItem,
    canOpenTrayItem,
    canDiscardTrayItem,
  };
}
