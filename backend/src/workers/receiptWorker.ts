import { Worker, Job } from 'bullmq';
import { redisConnection } from '../config/redis';
import { RECEIPT_QUEUE_NAME } from '../queues/receiptQueue';
import { analyzeReceiptImage } from '../services/geminiService';
import { saveParsedReceipt } from '../services/receiptService';
import logger from '../utils/logger';

/**
 * [Issue #43] レシート解析 Worker
 * 重複エラー時は throw せず、結果オブジェクトを返すことで無駄なリトライを防止します。
 */
const receiptWorker = new Worker(
  RECEIPT_QUEUE_NAME,
  async (job: Job) => {
    const { memberId, imagePath } = job.data;
    
    logger.info(`[Worker] ジョブ開始: ID ${job.id} (Member: ${memberId})`);

    try {
      // 1. Geminiによる画像解析（外部API通信）
      const parsedData = await analyzeReceiptImage(imagePath);

      // 2. DBへの永続化（ビジネスロジック・重複チェック含む）
      const result = await saveParsedReceipt(memberId, parsedData, imagePath);

      logger.info(`[Worker] ジョブ完了: ID ${job.id}, ReceiptID: ${result.id}`);
      
      return { 
        success: true, 
        receiptId: result.id 
      };

    } catch (error: any) {
      // 3. 重複検知時のハンドリング
      if (error.message === 'DUPLICATE_RECEIPT_DETECTED') {
        logger.warn(`[Worker] 重複を検知したためスキップ: ID ${job.id}`);
        
        // throw せずに return することで、BullMQ上は「成功（完了）」として扱いリトライを防ぐ
        return { 
          success: false, 
          errorType: 'DUPLICATE', 
          message: 'このレシートは既に登録されています。' 
        };
      }

      // 4. その他のシステムエラー
      logger.error(`[Worker] ジョブ失敗（リトライ対象）: ID ${job.id} - ${error.message}`);
      
      // throw することで BullMQ の attempts 設定に基づくリトライを実行させる
      throw error;
    }
  },
  {
    connection: redisConnection,
    // T320環境において外部API待ちを効率化するため、5スレッド並列で開始
    concurrency: 5, 
  }
);

// リトライを使い果たした最終失敗時のログ
receiptWorker.on('failed', (job, err) => {
  if (err.message !== 'DUPLICATE_RECEIPT_DETECTED') {
    logger.error(`[Worker] ジョブ最終失敗（リトライ上限到達）: ${job?.id} - ${err.message}`);
  }
});

export default receiptWorker;