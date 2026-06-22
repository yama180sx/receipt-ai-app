import type { Job } from 'bullmq';
import fs from 'fs/promises';
import path from 'path';
import { receiptQueue } from '../queues/receiptQueue';
import type { ReceiptJobListItem, ReceiptJobStatus } from '../types/apiSchemas';
import { checkDuplicateReceipt } from './duplicateReceiptService';
import { findReceiptIdByImagePath } from '../repositories/receiptRepository';
import { AppError } from '../utils/appError';

const LIST_JOB_STATES = ['waiting', 'active', 'completed', 'failed', 'delayed', 'paused'] as const;

type AnalyzeJobReturn = {
  parsedData?: {
    storeName?: string;
    purchaseDate?: string;
    totalAmount?: number;
    taxAmount?: number;
    items?: unknown[];
  };
  imagePath?: string;
  validation?: { isSuspicious: boolean; warnings: string[] };
};

function summarizeParsedData(parsedData: AnalyzeJobReturn['parsedData']) {
  if (!parsedData) return undefined;
  return {
    storeName: String(parsedData.storeName ?? ''),
    purchaseDate: String(parsedData.purchaseDate ?? ''),
    totalAmount: Math.round(Number(parsedData.totalAmount ?? 0)),
    taxAmount: parsedData.taxAmount != null ? Number(parsedData.taxAmount) : undefined,
    itemCount: Array.isArray(parsedData.items) ? parsedData.items.length : 0,
  };
}

export async function formatReceiptJobForApi(
  job: Job,
  familyGroupId: number
): Promise<ReceiptJobListItem> {
  const state = await job.getState();
  const imagePath =
    typeof job.data?.imagePath === 'string'
      ? job.data.imagePath.replace(/\\/g, '/')
      : null;

  const base: ReceiptJobListItem = {
    id: String(job.id),
    state,
    imagePath,
    createdAt: job.timestamp,
    failedReason: state === 'failed' ? job.failedReason ?? null : undefined,
  };

  if (state !== 'completed' || !job.returnvalue) {
    return base;
  }

  const result = job.returnvalue as AnalyzeJobReturn;
  const parsedData = result.parsedData;
  const validation = result.validation;

  const duplicate = parsedData
    ? await checkDuplicateReceipt(
        familyGroupId,
        parsedData,
        result.imagePath ?? imagePath
      )
    : { duplicateSuspected: false };

  return {
    ...base,
    parsedData: summarizeParsedData(parsedData),
    validation: validation
      ? {
          isSuspicious: Boolean(validation.isSuspicious),
          warnings: validation.warnings ?? [],
        }
      : undefined,
    duplicateSuspected: duplicate.duplicateSuspected,
    existingReceiptId: duplicate.existingReceiptId,
  };
}

/** ログインメンバー本人の解析ジョブ一覧（確認トレイ用） */
export async function listReceiptJobsForMember(
  familyGroupId: number,
  memberId: number
): Promise<ReceiptJobListItem[]> {
  const jobs = await receiptQueue.getJobs([...LIST_JOB_STATES], 0, 200, true);

  const owned = jobs.filter(
    (job) =>
      Number(job.data?.familyGroupId) === familyGroupId &&
      Number(job.data?.memberId) === memberId
  );

  owned.sort((a, b) => b.timestamp - a.timestamp);

  return Promise.all(owned.map((job) => formatReceiptJobForApi(job, familyGroupId)));
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

  return {
    ...payload,
    duplicateSuspected: duplicate.duplicateSuspected,
    existingReceiptId: duplicate.existingReceiptId ?? null,
  };
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
