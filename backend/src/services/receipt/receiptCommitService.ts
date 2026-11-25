import { saveConfirmedReceipt } from './receiptPersistenceService';
import { removeReceiptJobAfterCommit } from '../receiptJobService';
import { findReceiptAnalysisJob } from '../../repositories/receiptAnalysisJobRepository';
import { AppError } from '../../utils/appError';
import type { ReceiptCommitPayload } from '../../types/receipt';
import type { TenantContext } from '../../utils/context';
import { parseReceiptDate } from '../duplicateReceiptService';

export type CommitReceiptInput = {
  ctx: TenantContext;
  parsedData: ReceiptCommitPayload;
  imagePath: string;
  isSuspicious: boolean;
  warnings: string[];
  jobId?: string;
  reviewedDuplicateIds?: number[];
};

/** 解析結果の確定保存（必要に応じてジョブ削除） */
export async function commitReceipt(input: CommitReceiptInput) {
  const { ctx } = input;
  if (input.reviewedDuplicateIds && (
    typeof input.parsedData.storeName !== 'string' || !input.parsedData.storeName.trim() ||
    !parseReceiptDate(input.parsedData.purchaseDate || input.parsedData.date) ||
    typeof input.parsedData.totalAmount !== 'number' || !Number.isSafeInteger(input.parsedData.totalAmount) || input.parsedData.totalAmount < 0
  )) throw new AppError('店舗名・購入日時・金額を確認してください。', 400);
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
    imageHash,
    input.reviewedDuplicateIds
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
