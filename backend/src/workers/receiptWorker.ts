import { Worker, Job } from 'bullmq';
import { redisConnection } from '../config/redis';
import { RECEIPT_QUEUE_NAME } from '../queues/receiptQueue';
import { analyzeOnly } from '../services/receiptService'; 
import { runWithTenant } from '../utils/context';
import logger from '../utils/logger';

/**
 * [Issue #49-8]
 * 解析ジョブの責務を「保存」から「解析のみ」へ変更。
 * 保存（永続化）はフロントエンドでのユーザー確認後に別エンドポイントで行うフローに移行。
 */
const receiptWorker = new Worker(
  RECEIPT_QUEUE_NAME,
  async (job: Job) => {
    const { memberId, familyGroupId, imagePath } = job.data;
    logger.info(`[Worker] ジョブ開始 (解析のみ): ID ${job.id} (世帯: ${familyGroupId}, 会員: ${memberId})`);

    // テナントコンテキスト内で実行
    return await runWithTenant({ familyGroupId, memberId }, async () => {
      try {
        // analyzeOnly は DB 保存を行わず、Gemini の解析結果、画像パス、バリデーション結果を返す
        const result = await analyzeOnly(memberId, imagePath);
        
        logger.info(`[Worker] 解析完了: ID ${job.id} (画像: ${imagePath})`);

        // この戻り値が job.returnvalue となり、フロントエンドのポーリング側で取得可能になる
        return result;

      } catch (error: any) {
        // 重複チェックは保存時に行うため、Worker レベルでは主に API 通信や画像処理エラーを捕捉
        logger.error(`[Worker] ジョブ失敗: ID ${job.id} - ${error.message}`);
        
        // ジョブ自体を失敗状態にする
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