import { Worker, Job } from 'bullmq';
import { redisConnection } from '../config/redis';
import { RECEIPT_QUEUE_NAME } from '../queues/receiptQueue';
import { analyzeOnly } from '../services/receiptService'; 
import { runWithTenant } from '../utils/context';
import logger from '../utils/logger';

/**
 * [Issue #49-8 / #71]
 * 解析ジョブの責務は「解析のみ」とし、その結果（taxAmountを含む）をフロントエンドへ返却する。
 * 永続化（保存）は、ユーザーがフロントエンドで確認・修正した後に別プロセスで実行される。
 */
const receiptWorker = new Worker(
  RECEIPT_QUEUE_NAME,
  async (job: Job) => {
    const { memberId, familyGroupId, imagePath } = job.data;
    logger.info(`[Worker] ジョブ開始 (解析のみ): ID ${job.id} (世帯: ${familyGroupId}, 会員: ${memberId})`);

    // テナントコンテキスト（familyGroupId）内で実行し、データ分離を担保
    return await runWithTenant({ familyGroupId, memberId }, async () => {
      try {
        /**
         * analyzeOnly の内部で geminiService.analyzeReceiptImage が呼ばれます。
         * [Issue #71] により、戻り値の ParsedReceipt に taxAmount が含まれるようになっています。
         */
        const result = await analyzeOnly(memberId, imagePath);
        
        logger.info(`[Worker] 解析完了: ID ${job.id} (画像: ${imagePath}, taxAmount抽出: ${result.parsedData.taxAmount ?? 0})`);

        // この戻り値は BullMQ の job.returnvalue となり、
        // フロントエンドのポーリングエンドポイント経由でユーザーに渡されます。
        return result;

      } catch (error: any) {
        // 画像読み込みエラーや Gemini API エラー（429/500等）を捕捉
        logger.error(`[Worker] ジョブ失敗: ID ${job.id} - ${error.message}`);
        
        // ジョブを失敗状態 (failed) にし、必要に応じて BullMQ のリトライ機能に委ねる
        throw error;
      }
    });
  },
  { 
    connection: redisConnection, 
    concurrency: 5 // T320の20スレッドを活かし、並列度を調整
  }
);

export default receiptWorker;