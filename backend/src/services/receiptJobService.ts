import type { Job } from 'bullmq';
import { receiptQueue } from '../queues/receiptQueue';
import { checkDuplicateReceipt } from './duplicateReceiptService';

const LIST_JOB_STATES = ['waiting', 'active', 'completed', 'failed', 'delayed', 'paused'] as const;

export type ReceiptJobListItem = {
  id: string;
  state: string;
  imagePath: string | null;
  createdAt: number;
  failedReason?: string | null;
  parsedData?: {
    storeName: string;
    purchaseDate: string;
    totalAmount: number;
    taxAmount?: number;
    itemCount: number;
  };
  validation?: {
    isSuspicious: boolean;
    warnings: string[];
  };
  duplicateSuspected?: boolean;
  existingReceiptId?: number;
};

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
  payload: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const state = payload.state as string;
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
    existingReceiptId: duplicate.existingReceiptId,
  };
}
