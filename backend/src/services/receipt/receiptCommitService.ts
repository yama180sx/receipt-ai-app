import { saveConfirmedReceipt } from './receiptPersistenceService';
import { removeReceiptJobAfterCommit } from '../receiptJobService';
import type { ReceiptCommitPayload } from '../../types/receipt';

export type CommitReceiptInput = {
  memberId: number;
  familyGroupId: number;
  parsedData: ReceiptCommitPayload;
  imagePath: string;
  isSuspicious: boolean;
  warnings: string[];
  jobId?: string;
};

/** 解析結果の確定保存（必要に応じてジョブ削除） */
export async function commitReceipt(input: CommitReceiptInput) {
  const result = await saveConfirmedReceipt(
    input.memberId,
    input.familyGroupId,
    input.parsedData,
    input.imagePath,
    input.isSuspicious,
    input.warnings
  );

  if (input.jobId) {
    await removeReceiptJobAfterCommit(String(input.jobId), input.familyGroupId, input.memberId).catch(
      () => {
        // 既に破棄済み等は無視（保存は成功している）
      }
    );
  }

  return result;
}
