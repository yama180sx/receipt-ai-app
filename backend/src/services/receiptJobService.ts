import type { Job } from 'bullmq';
import fs from 'fs/promises';
import path from 'path';
import { receiptQueue } from '../queues/receiptQueue';
import type { ReceiptJobStatus } from '../types/apiSchemas';
import {
  applyDuplicateFlagsToJobStatus,
  mapReceiptJobToListItem,
} from '../mappers/receiptMapper';
import { checkDuplicateReceipt } from './duplicateReceiptService';
import { findReceiptIdByImagePath } from '../repositories/receiptRepository';
import { AppError } from '../utils/appError';

const LIST_JOB_STATES = ['waiting', 'active', 'completed', 'failed', 'delayed', 'paused'] as const;

type AnalyzeJobReturn = {
  parsedData?: {
    storeName?: string;
    purchaseDate?: string;
    totalAmount?: number;
    items?: unknown[];
  };
  imagePath?: string;
};

/** ログインメンバー本人の解析ジョブ一覧（確認トレイ用） */
export async function listReceiptJobsForMember(familyGroupId: number, memberId: number) {
  const jobs = await receiptQueue.getJobs([...LIST_JOB_STATES], 0, 200, true);

  const owned = jobs.filter(
    (job) =>
      Number(job.data?.familyGroupId) === familyGroupId &&
      Number(job.data?.memberId) === memberId
  );

  owned.sort((a, b) => b.timestamp - a.timestamp);

  return Promise.all(owned.map((job) => mapReceiptJobToListItem(job, familyGroupId)));
}

export async function enrichCompletedJobPayload(
  job: Job,
  familyGroupId: number,
  payload: ReceiptJobStatus
): Promise<ReceiptJobStatus> {
  const state = payload.state;
  if (state !== 'completed' || !job.returnvalue) {
    return payload;
  }

  const result = job.returnvalue as AnalyzeJobReturn;
  if (!result.parsedData) {
    return payload;
  }

  const duplicate = await checkDuplicateReceipt(
    familyGroupId,
    result.parsedData,
    result.imagePath ?? job.data?.imagePath
  );

  return applyDuplicateFlagsToJobStatus(payload, duplicate);
}

async function getOwnedReceiptJob(
  jobId: string,
  familyGroupId: number,
  memberId: number
): Promise<Job> {
  const job = await receiptQueue.getJob(jobId);
  if (!job) {
    throw new AppError('ジョブが見つかりません。', 404);
  }

  const jobFamilyGroupId = Number(job.data?.familyGroupId);
  const jobMemberId = Number(job.data?.memberId);
  if (
    !jobFamilyGroupId ||
    jobFamilyGroupId !== familyGroupId ||
    jobMemberId !== memberId
  ) {
    throw new AppError('ジョブが見つかりません。', 404);
  }

  return job;
}

async function deletePendingJobImage(
  imagePath: string | undefined,
  familyGroupId: number
): Promise<void> {
  if (!imagePath || typeof imagePath !== 'string') return;

  const normalized = imagePath.replace(/\\/g, '/');
  const saved = await findReceiptIdByImagePath(familyGroupId, normalized);
  if (saved) return;

  try {
    await fs.unlink(path.resolve(normalized));
  } catch {
    // ファイルが無い場合は無視
  }
}

/** commit 成功後: キューから除去（画像は保存済みのため残す） */
export async function removeReceiptJobAfterCommit(
  jobId: string,
  familyGroupId: number,
  memberId: number
): Promise<void> {
  const job = await getOwnedReceiptJob(jobId, familyGroupId, memberId);
  await job.remove();
}

/** 未取り込みジョブの破棄（キュー除去 + 未保存画像の削除） */
export async function discardReceiptJobForMember(
  jobId: string,
  familyGroupId: number,
  memberId: number
): Promise<void> {
  const job = await getOwnedReceiptJob(jobId, familyGroupId, memberId);
  const imagePath = job.data?.imagePath;
  await job.remove();
  await deletePendingJobImage(imagePath, familyGroupId);
}
