import type { ReceiptJobListItem, ReceiptJobState, ReceiptTrayItem } from '../types/receiptJob';

export type ReceiptJobDisplayKind =
  | 'queued'
  | 'processing'
  | 'ready'
  | 'duplicate_suspected'
  | 'failed';

export type ReceiptJobDisplay = {
  kind: ReceiptJobDisplayKind;
  label: string;
  isActive: boolean;
};

const ACTIVE_STATES: ReceiptJobState[] = ['waiting', 'active', 'delayed', 'paused'];

export function getReceiptJobDisplay(job: ReceiptJobListItem): ReceiptJobDisplay {
  if (job.state === 'failed') {
    return { kind: 'failed', label: '失敗', isActive: false };
  }

  if (ACTIVE_STATES.includes(job.state)) {
    const label = job.state === 'active' ? '解析中' : '待機中';
    return { kind: job.state === 'active' ? 'processing' : 'queued', label, isActive: true };
  }

  if (job.duplicateSuspected) {
    return { kind: 'duplicate_suspected', label: '重複の疑い', isActive: false };
  }

  return { kind: 'ready', label: '確認待ち', isActive: false };
}

export function getReceiptTrayItemTitle(item: ReceiptTrayItem): string {
  if ('localOnly' in item && item.localOnly) {
    return 'アップロード失敗';
  }

  const storeName = item.parsedData?.storeName?.trim();
  if (storeName) return storeName;
  if (item.state === 'failed') return '解析失敗';
  if (ACTIVE_STATES.includes(item.state)) return '解析中…';
  return 'レシート';
}

export function countActiveReceiptJobs(jobs: ReceiptJobListItem[]): number {
  return jobs.filter((job) => ACTIVE_STATES.includes(job.state)).length;
}

export function sortReceiptTrayItems(items: ReceiptTrayItem[]): ReceiptTrayItem[] {
  return [...items].sort((a, b) => b.createdAt - a.createdAt);
}
