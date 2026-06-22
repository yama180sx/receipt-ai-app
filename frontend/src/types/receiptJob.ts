/**
 * レシート解析ジョブ型
 *
 * - DTO: OpenAPI generated の re-export
 * - ViewModel: トレイ表示・ローカル失敗行（OpenAPI 非該当）
 */

/** OpenAPI DTO（receipt jobs API） */
export type { ReceiptJobListItem } from '../api/generated';

/** BullMQ 状態の UI 表示用（ViewModel — API state 文字列のサブセット） */
export type ReceiptJobState =
  | 'waiting'
  | 'active'
  | 'completed'
  | 'failed'
  | 'delayed'
  | 'paused';

/** アップロード失敗など、サーバーにジョブが無いローカル行（ViewModel） */
export type LocalFailedReceiptJob = {
  id: string;
  state: 'failed';
  createdAt: number;
  failedReason: string;
  localOnly: true;
};

/** トレイ一覧の行（DTO またはローカル失敗 ViewModel） */
export type ReceiptTrayItem = import('../api/generated').ReceiptJobListItem | LocalFailedReceiptJob;
