import { Queue } from 'bullmq';
import { redisConnection } from '../config/redis';

// キュー名の定義
export const RECEIPT_QUEUE_NAME = 'receipt-analysis';

/**
 * レシート解析ジョブキューの定義
 * ジョブの投入（Add）を行うためのインスタンスをエクスポートします。
 */
export const receiptQueue = new Queue(RECEIPT_QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    // ★ 修正：完了後も30分(1800秒)はデータを保持し、ポーリングを可能にする
    removeOnComplete: { age: 1800 }, 
    removeOnFail: false,
  },
});