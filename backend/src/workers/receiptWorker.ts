import { Worker, Job } from 'bullmq';
import { redisConnection } from '../config/redis';
import { RECEIPT_QUEUE_NAME } from '../queues/receiptQueue';
import { processAndSaveReceipt } from '../services/receiptService'; 
import { runWithTenant } from '../utils/context';
import logger from '../utils/logger';

/**
 * [Issue #53 最終修正]
 * フロントエンドの期待値(items配列を含むオブジェクト)を返すように修正
 */
const receiptWorker = new Worker(
  RECEIPT_QUEUE_NAME,
  async (job: Job) => {
    const { memberId, familyGroupId, imagePath } = job.data;
    logger.info(`[Worker] ジョブ開始: ID ${job.id} (世帯: ${familyGroupId})`);

    return await runWithTenant({ familyGroupId, memberId }, async () => {
      try {
        // processAndSaveReceipt は内部で items を含む POJO を返します
        const result = await processAndSaveReceipt(memberId, imagePath);
        
        logger.info(`[Worker] 解析・保存完了: ID ${job.id}, ReceiptID: ${result.id}`);

        // ★【重要】 フロントのバリデーションを通すため、result（全データ）をそのまま返す
        // これにより job.returnvalue に items, isSuspicious, warnings 等が含まれます
        return result;

      } catch (error: any) {
        // 重複チェックのエラーハンドリング
        if (error.message === 'DUPLICATE_RECEIPT_DETECTED' || error.statusCode === 409) {
          logger.warn(`[Worker] 重複スキップ: ID ${job.id}`);
          // 重複時はフロントで処理できるようエラー型を返す
          return { success: false, errorType: 'DUPLICATE' };
        }

        logger.error(`[Worker] ジョブ失敗: ID ${job.id} - ${error.message}`);
        throw error;
      }
    });
  },
  { 
    connection: redisConnection, 
    concurrency: 5 
  }
);

export default receiptWorker;