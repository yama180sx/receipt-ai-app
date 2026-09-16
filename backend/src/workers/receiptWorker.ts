import { Worker, Job, UnrecoverableError } from 'bullmq';
import { redisConnection } from '../config/redis';
import { RECEIPT_QUEUE_NAME } from '../queues/receiptQueue';
import { analyzeOnly } from '../services/receipt/receiptAnalysisService';
import { runWithTenant } from '../utils/context';
import logger from '../utils/logger';
import { getErrorMessage, isGeminiDailyQuotaError, isRetryableHttpError } from '../utils/httpError';
import { getReceiptAnalysisFailureCode } from '../config/receiptRetryPolicy';
import { ReceiptAnalysisJobStatus } from '@prisma/client';
import { updateReceiptAnalysisJob } from '../repositories/receiptAnalysisJobRepository';
import { AppError } from '../utils/appError';

/** 利用者に内部実装や英語のプロバイダーエラーを表示しない。 */
export function getReceiptAnalysisFailureMessage(error: unknown): string {
  if (error instanceof AppError) return error.message;
  if (isGeminiDailyQuotaError(error)) {
    return 'AI解析の1日の利用上限に達しました。時間をおいてから再実行してください。';
  }
  if (isRetryableHttpError(error)) {
    return '解析サービスで一時的なエラーが発生しました。時間をおいてから再実行してください。';
  }
  return 'レシートを解析できませんでした。レシート全体が明るく写るように再撮影してください。';
}

/**
 * [Issue #49-8 / #71]
 * 解析ジョブの責務は「解析のみ」とし、その結果（taxAmountを含む）をフロントエンドへ返却する。
 * 永続化（保存）は、ユーザーがフロントエンドで確認・修正した後に別プロセスで実行される。
 */
const receiptWorker = new Worker(
  RECEIPT_QUEUE_NAME,
  async (job: Job) => {
    const { memberId, familyGroupId, imagePath } = job.data;
    await updateReceiptAnalysisJob(String(job.id), { status: ReceiptAnalysisJobStatus.PROCESSING });
    logger.info(`[Worker] ジョブ開始 (解析のみ): ID ${job.id} (世帯: ${familyGroupId}, 会員: ${memberId})`);

    // テナントコンテキスト（familyGroupId）内で実行し、データ分離を担保
    return await runWithTenant({ familyGroupId, memberId }, async () => {
      try {
        /**
         * analyzeOnly の内部で ReceiptAnalysisProvider（Gemini）が呼ばれます。
         * [Issue #71] により、戻り値の ParsedReceipt に taxAmount が含まれるようになっています。
         */
        const result = await analyzeOnly({ familyGroupId, memberId }, imagePath);
        
        logger.info(`[Worker] 解析完了: ID ${job.id} (画像: ${imagePath}, taxAmount抽出: ${result.parsedData.taxAmount ?? 0})`);

        // この戻り値は BullMQ の job.returnvalue となり、
        // フロントエンドのポーリングエンドポイント経由でユーザーに渡されます。
        await updateReceiptAnalysisJob(String(job.id), { status: ReceiptAnalysisJobStatus.AWAITING_CONFIRMATION });
        return result;

      } catch (error: unknown) {
        const technicalMessage = getErrorMessage(error);
        const message = getReceiptAnalysisFailureMessage(error);
        const failureCode = getReceiptAnalysisFailureCode(error);
        await job.updateData({ ...job.data, failureCode: failureCode ?? null });
        await updateReceiptAnalysisJob(String(job.id), { status: ReceiptAnalysisJobStatus.FAILED, failureCode: failureCode ?? null, failureReason: message });
        logger.error(`[Worker] ジョブ失敗: ID ${job.id} - ${technicalMessage}`);

        // 日次枠切れなど、BullMQ 再試行しても回復しないエラーは即 failed にする
        if (!isRetryableHttpError(error)) {
          throw new UnrecoverableError(message);
        }
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
