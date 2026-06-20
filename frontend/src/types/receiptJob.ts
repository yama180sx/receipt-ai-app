export type { ReceiptJobListItem } from '../api/generated';

export type ReceiptJobState =
  | 'waiting'
  | 'active'
  | 'completed'
  | 'failed'
  | 'delayed'
  | 'paused';

/** アップロード失敗など、サーバーにジョブが無いローカル行 */
export type LocalFailedReceiptJob = {
  id: string;
  state: 'failed';
  createdAt: number;
  failedReason: string;
  localOnly: true;
};

export type ReceiptTrayItem = import('../api/generated').ReceiptJobListItem | LocalFailedReceiptJob;
