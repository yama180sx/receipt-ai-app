import { Worker, Job } from 'bullmq';
import { redisConnection } from '../config/redis';
import { RECEIPT_QUEUE_NAME } from '../queues/receiptQueue';
import { analyzeReceiptImage } from '../services/geminiService';
import { saveReceiptData } from '../services/persistenceService'; // 統合済みの保存サービスを使用
import { runWithTenant } from '../utils/context';
import logger from '../utils/logger';

/**
 * [Issue #43 & #45] レシート解析 Worker
 */
const receiptWorker = new Worker(
  RECEIPT_QUEUE_NAME,
  async (job: Job) => {
    const { memberId, familyGroupId, imagePath } = job.data;
    
    logger.info(`[Worker] ジョブ開始: ID ${job.id} (世帯: ${familyGroupId})`);

    return await runWithTenant({ familyGroupId, memberId }, async () => {
      try {
        // 1. Gemini AIによる解析
        // 戻り値を any にキャストして、プロパティの有無による型エラーを強制的に回避します
        const parsedData = (await analyzeReceiptImage(imagePath)) as any;

        // 2. DBへの永続化
        const result = await saveReceiptData({
          memberId,
          familyGroupId,
          storeName: parsedData.storeName || '不明な店舗',
          // 文字列が保証されない場合でも Date オブジェクトを生成させる
          date: new Date(parsedData.date || Date.now()), 
          totalAmount: Number(parsedData.totalAmount || 0),
          items: (parsedData.items || []).map((item: any) => ({
            name: item.name,
            price: Number(item.price || 0),
            quantity: Number(item.quantity || 1),
            categoryId: item.categoryId ? Number(item.categoryId) : null
          })),
          imagePath: imagePath,
          // rawText が undefined でも null として流し込む
          rawText: parsedData.rawText ?? null, 
        });

        logger.info(`[Worker] ジョブ完了: ID ${job.id}, ReceiptID: ${result.id}`);
        return { success: true, receiptId: result.id };

      } catch (error: any) {
        if (error.message === 'DUPLICATE_RECEIPT_DETECTED' || error.statusCode === 409) {
          logger.warn(`[Worker] 重複スキップ: ID ${job.id}`);
          return { success: false, errorType: 'DUPLICATE' };
        }
        logger.error(`[Worker] ジョブ失敗: ID ${job.id} - ${error.message}`);
        throw error;
      }
    });
  },
  {
    connection: redisConnection,
    concurrency: 5, 
  }
);

export default receiptWorker;