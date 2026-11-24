import { saveConfirmedReceipt } from './receiptPersistenceService';
import { removeReceiptJobAfterCommit } from '../receiptJobService';
import { findReceiptAnalysisJob } from '../../repositories/receiptAnalysisJobRepository';
import { AppError } from '../../utils/appError';
import type { ReceiptCommitPayload } from '../../types/receipt';
import type { TenantContext } from '../../utils/context';

export type CommitReceiptInput = {
  ctx: TenantContext;
  parsedData: ReceiptCommitPayload;
  imagePath: string;
  isSuspicious: boolean;
  warnings: string[];
  jobId?: string;
};

/** 解析結果の確定保存（必要に応じてジョブ削除） */
export async function commitReceipt(input: CommitReceiptInput) {
  const { ctx } = input;
  let imageHash: string | undefined;

  if (input.jobId) {
    const job = await findReceiptAnalysisJob(String(input.jobId), ctx.familyGroupId, ctx.memberId);
    if (job) {
      if (job.imagePath !== input.imagePath) {
        throw new AppError('解析ジョブと画像が一致しません。', 409);
      }
      imageHash = job.imageHash ?? undefined;
    }
  }

  const result = await saveConfirmedReceipt(
    ctx.memberId,
    ctx.familyGroupId,
    input.parsedData,
    input.imagePath,
    input.isSuspicious,
    input.warnings,
    imageHash
  );

  if (input.jobId) {
    await removeReceiptJobAfterCommit(String(input.jobId), ctx.familyGroupId, ctx.memberId).catch(
      () => {
        // 既に破棄済み等は無視（保存は成功している）
      }
    );
  }

  return result;
}
