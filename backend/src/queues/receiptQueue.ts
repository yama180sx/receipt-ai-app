import { Queue } from 'bullmq';
import { redisConnection } from '../config/redis';
import { RECEIPT_JOB_OPTIONS } from './receiptQueueOptions';

// キュー名の定義
export const RECEIPT_QUEUE_NAME = 'receipt-analysis';

/**
 * レシート解析ジョブキューの定義
 * ジョブの投入（Add）を行うためのインスタンスをエクスポートします。
 */
export const receiptQueue = new Queue(RECEIPT_QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: RECEIPT_JOB_OPTIONS,
});
