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
import { getReceiptManualRetryInfo } from '../config/receiptRetryPolicy';
import { ReceiptAnalysisJobStatus } from '@prisma/client';
import {
  deleteReceiptAnalysisJob,
  findReceiptAnalysisJob,
  listRecoverableReceiptAnalysisJobs,
  listReceiptAnalysisJobsForMember,
  updateReceiptAnalysisJob,
} from '../repositories/receiptAnalysisJobRepository';

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

export async function enqueueReceiptAnalysisJob(job: { id: string; memberId: number; familyGroupId: number; imagePath: string; manualRetryCount?: number }) {
  await receiptQueue.add('analyze-receipt', job, { jobId: job.id });
  await updateReceiptAnalysisJob(job.id, { status: ReceiptAnalysisJobStatus.QUEUED, lastEnqueuedAt: new Date() });
}

/** 起動・接続復旧時に、キューにない未完了台帳だけを同じ jobId で復元する。 */
let recoveryInProgress = false;

export async function recoverReceiptAnalysisJobs(force = false) {
  if (recoveryInProgress) return;
  recoveryInProgress = true;
  try {
    const jobs = await listRecoverableReceiptAnalysisJobs({ force, limit: 100 });
    for (const job of jobs) {
      if (await receiptQueue.getJob(job.id)) continue;
      await enqueueReceiptAnalysisJob(job);
    }
  } finally {
    recoveryInProgress = false;
  }
}

/** ログインメンバー本人の解析ジョブ一覧（確認トレイ用） */
export async function listReceiptJobsForMember(familyGroupId: number, memberId: number) {
  const jobs = await receiptQueue.getJobs([...LIST_JOB_STATES], 0, 200, true);

  const owned = jobs.filter(
    (job) =>
      Number(job.data?.familyGroupId) === familyGroupId &&
      Number(job.data?.memberId) === memberId
  );

  owned.sort((a, b) => b.timestamp - a.timestamp);

  const queueItems = await Promise.all(owned.map((job) => mapReceiptJobToListItem(job, familyGroupId)));
  const queuedIds = new Set(queueItems.map((job) => job.id));
  const ledgerItems = await Promise.all(
    (await listReceiptAnalysisJobsForMember(familyGroupId, memberId))
      .filter((job) => !queuedIds.has(job.id))
      .map(async (job) => {
        const state = job.status === ReceiptAnalysisJobStatus.FAILED ? 'failed' : 'waiting';
        let imagePath: string | null = job.imagePath;
        if (state === 'failed') {
          try {
            imagePath = await ensureRetryableJobImage(job.imagePath);
          } catch {
            imagePath = null;
          }
        }

        return {
          id: job.id,
          state,
          imagePath: job.imagePath,
          createdAt: job.createdAt.getTime(),
          failedReason: job.failureReason,
          retry: state === 'failed'
            ? getReceiptManualRetryInfo({
              state,
              imagePath,
              failureCode: job.failureCode,
              failedReason: job.failureReason,
              manualRetryCount: job.manualRetryCount,
              failedAt: job.updatedAt,
            })
            : undefined,
        };
      })
  );
  return [...queueItems, ...ledgerItems].sort((a, b) => b.createdAt - a.createdAt);
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

async function ensureRetryableJobImage(imagePath: unknown): Promise<string> {
  if (typeof imagePath !== 'string') {
    throw new AppError('元画像が見つかりません。再撮影してください。', 409);
  }

  const normalized = imagePath.replace(/\\/g, '/');
  const uploadsDirectory = path.resolve('uploads');
  const fullPath = path.resolve(normalized);
  if (!fullPath.startsWith(`${uploadsDirectory}${path.sep}`)) {
    throw new AppError('元画像が見つかりません。再撮影してください。', 409);
  }

  try {
    await fs.access(fullPath);
  } catch {
    throw new AppError('元画像が見つかりません。再撮影してください。', 409);
  }
  return normalized;
}

/** commit 成功後: キューから除去（画像は保存済みのため残す） */
export async function removeReceiptJobAfterCommit(
  jobId: string,
  familyGroupId: number,
  memberId: number
): Promise<void> {
  const job = await receiptQueue.getJob(jobId);
  if (job) {
    const owned = Number(job.data?.familyGroupId) === familyGroupId && Number(job.data?.memberId) === memberId;
    if (!owned) throw new AppError('ジョブが見つかりません。', 404);
    await job.remove();
  } else if (!await findReceiptAnalysisJob(jobId, familyGroupId, memberId)) {
    throw new AppError('ジョブが見つかりません。', 404);
  }
  await deleteReceiptAnalysisJob(jobId, familyGroupId, memberId);
}

/** 未取り込みジョブの破棄（キュー除去 + 未保存画像の削除） */
export async function discardReceiptJobForMember(
  jobId: string,
  familyGroupId: number,
  memberId: number
): Promise<void> {
  const job = await receiptQueue.getJob(jobId);
  const ledger = await findReceiptAnalysisJob(jobId, familyGroupId, memberId);
  if (!job && !ledger) throw new AppError('ジョブが見つかりません。', 404);
  if (job && (Number(job.data?.familyGroupId) !== familyGroupId || Number(job.data?.memberId) !== memberId)) {
    throw new AppError('ジョブが見つかりません。', 404);
  }
  const imagePath = job?.data?.imagePath ?? ledger?.imagePath;
  if (job) await job.remove();
  await deleteReceiptAnalysisJob(jobId, familyGroupId, memberId);
  await deletePendingJobImage(imagePath, familyGroupId);
}

/**
 * 失敗した本人ジョブを、同じ未保存画像・同じ jobId で再投入する。
 * 同じ jobId を使い、二重タップ・並行要求での重複投入を防ぐ。
 */
export async function retryFailedReceiptJobForMember(
  jobId: string,
  familyGroupId: number,
  memberId: number
) {
  const queuedJob = await receiptQueue.getJob(jobId);
  if (!queuedJob) {
    const ledger = await findReceiptAnalysisJob(jobId, familyGroupId, memberId);
    if (!ledger || ledger.status !== ReceiptAnalysisJobStatus.FAILED) {
      throw new AppError('再実行できるのは失敗した解析ジョブのみです。', 409);
    }
    const imagePath = await ensureRetryableJobImage(ledger.imagePath);
    const retryInfo = getReceiptManualRetryInfo({ state: 'failed', imagePath, failureCode: ledger.failureCode, failedReason: ledger.failureReason, manualRetryCount: ledger.manualRetryCount, failedAt: ledger.updatedAt });
    if (!retryInfo.eligible) throw new AppError('この解析失敗は再実行できません。再撮影してください。', 409);
    const manualRetryCount = ledger.manualRetryCount + 1;
    await receiptQueue.add('analyze-receipt', { id: jobId, memberId, familyGroupId, imagePath, manualRetryCount }, { jobId });
    await updateReceiptAnalysisJob(jobId, { status: ReceiptAnalysisJobStatus.QUEUED, manualRetryCount, failureCode: null, failureReason: null, lastEnqueuedAt: new Date() });
    return { id: jobId };
  }
  const job = await getOwnedReceiptJob(jobId, familyGroupId, memberId);
  if (await job.getState() !== 'failed') {
    throw new AppError('再実行できるのは失敗した解析ジョブのみです。', 409);
  }

  const imagePath = await ensureRetryableJobImage(job.data?.imagePath);
  const retryInfo = getReceiptManualRetryInfo({
    state: 'failed',
    imagePath,
    failureCode: typeof job.data?.failureCode === 'string' ? job.data.failureCode : null,
    failedReason: job.failedReason,
    manualRetryCount: job.data?.manualRetryCount,
    failedAt: job.finishedOn ?? job.timestamp,
  });
  if (!retryInfo.eligible) {
    if (retryInfo.availableAt) {
      throw new AppError('Geminiの日次無料枠が回復するまで再実行できません。手入力するか、次回リセット後に再実行してください。', 409);
    }
    throw new AppError('この解析失敗は再実行できません。再撮影してください。', 409);
  }

  await job.remove();
  const retriedJob = await receiptQueue.add(
    'analyze-receipt',
    {
      id: String(job.id),
      memberId,
      familyGroupId,
      imagePath,
      manualRetryCount: Number(job.data?.manualRetryCount) + 1 || 1,
    },
    { jobId: String(job.id) }
  );
  const ledger = await findReceiptAnalysisJob(jobId, familyGroupId, memberId);
  if (ledger) {
    await updateReceiptAnalysisJob(jobId, {
      status: ReceiptAnalysisJobStatus.QUEUED,
      manualRetryCount: Number(job.data?.manualRetryCount) + 1 || 1,
      failureCode: null,
      failureReason: null,
      lastEnqueuedAt: new Date(),
    });
  }
  return retriedJob;
}
