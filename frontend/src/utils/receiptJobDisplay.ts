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

export function formatReceiptTrayDateTime(createdAt: number): string {
  return new Date(createdAt).toLocaleString('ja-JP', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getReceiptTrayItemSubtitle(item: ReceiptTrayItem): string {
  if ('localOnly' in item && item.localOnly) {
    return item.failedReason;
  }

  if (item.state === 'failed') {
    return item.failedReason || '解析に失敗しました';
  }

  const parts: string[] = [formatReceiptTrayDateTime(item.createdAt)];

  if (item.parsedData?.totalAmount != null) {
    parts.push(`¥${Math.round(item.parsedData.totalAmount).toLocaleString()}`);
  }

  if ('existingReceiptId' in item && item.existingReceiptId) {
    parts.push(`既存 #${item.existingReceiptId}`);
  }

  return parts.join(' · ');
}

export function resolveReceiptTrayItemDisplay(item: ReceiptTrayItem): ReceiptJobDisplay {
  if ('localOnly' in item && item.localOnly) {
    return { kind: 'failed', label: '失敗', isActive: false };
  }
  return getReceiptJobDisplay(item);
}

export type ReceiptTraySection = {
  title: string;
  kind: ReceiptJobDisplayKind;
  items: ReceiptTrayItem[];
};

const TRAY_SECTIONS: { kind: ReceiptJobDisplayKind; title: string }[] = [
  { kind: 'processing', title: '解析中' },
  { kind: 'queued', title: '待機中' },
  { kind: 'ready', title: '確認待ち' },
  { kind: 'duplicate_suspected', title: '重複の疑い' },
  { kind: 'failed', title: '失敗' },
];

/** 状態別セクション（表示順固定） */
export function groupReceiptTrayItems(items: ReceiptTrayItem[]): ReceiptTraySection[] {
  const buckets = new Map<ReceiptJobDisplayKind, ReceiptTrayItem[]>(
    TRAY_SECTIONS.map((section) => [section.kind, []])
  );

  for (const item of sortReceiptTrayItems(items)) {
    const display = resolveReceiptTrayItemDisplay(item);
    buckets.get(display.kind)?.push(item);
  }

  return TRAY_SECTIONS.map((section) => ({
    ...section,
    items: buckets.get(section.kind) ?? [],
  })).filter((section) => section.items.length > 0);
}

export function countReceiptTrayItems(items: ReceiptTrayItem[]): number {
  return items.length;
}
