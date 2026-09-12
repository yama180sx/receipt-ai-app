import path from 'path';
import sharp from 'sharp';
import { AppError } from '../utils/appError';
import { receiptQueue } from '../queues/receiptQueue';
import { createReceiptAnalysisJob, findReceiptAnalysisJob } from '../repositories/receiptAnalysisJobRepository';
import { enqueueReceiptAnalysisJob } from '../services/receiptJobService';
import { isReceiptAnalysisMaintenanceMode } from '../config/receiptAnalysisMaintenance';
import {
  enrichCompletedJobPayload,
  listReceiptJobsForMember,
  discardReceiptJobForMember,
  retryFailedReceiptJobForMember,
} from '../services/receiptJobService';
import { requireTenantContext } from '../utils/context';
import { getRouteParam } from '../utils/routeParams';
import { sendMessage, sendSuccess } from '../utils/sendApiResponse';
import { asyncHandler } from '../utils/asyncHandler';
import logger from '../utils/logger';
import type { ReceiptCommitPayload, ReceiptCreateItemInput } from '../types/receipt';
import {
  mapFamilyMembersToSummary,
  mapItemSplitsUpdateResult,
  mapJobToStatus,
  mapReceiptItemToDetail,
  mapReceiptList,
  mapProductClassificationReviewItems,
  mapReceiptToDetail,
  mapUploadJobResponse,
} from '../mappers/receiptMapper';
import { mapAdvancedStatsToApi, mapMonthlyStatsToApi } from '../mappers/statsMapper';
import { commitReceipt as commitReceiptService } from '../services/receipt/receiptCommitService';
import { createManualReceipt } from '../services/receipt/receiptUpdateService';
import {
  listReceipts,
  getReceiptById,
  getLatestReceipt as fetchLatestReceipt,
  deleteReceiptById,
  listFamilyMembers,
} from '../services/receipt/receiptQueryService';
import { updateReceiptById, updateItemCategoryById } from '../services/receipt/receiptUpdateService';
import { correctItemProductClassification } from '../services/productClassification/productClassificationCorrectionService';
import { listProductClassificationCandidates } from '../services/productClassification/productClassificationCandidateService';
import { mapProductClassificationCandidatesToSummary } from '../mappers/productClassificationMapper';
import { listProductClassificationReviewItems } from '../services/productClassification/productClassificationReviewService';
import { updateItemSplitsById } from '../services/settlement/itemSplitService';
import {
  getMonthlyStats as fetchMonthlyStats,
  getAdvancedStats as fetchAdvancedStats,
} from '../services/receipt/receiptStatsService';
import { SplitInput } from '../services/settlement/itemSplitAllocation';
import { getCleanText } from '../utils/normalizer';
import { decodeReceiptCursor, type ReceiptPaginationFilters } from '../utils/receiptPaginationCursor';
import { normalizeYearMonth } from '../utils/yearMonth';

function invalidQueryParameter(message: string): never {
  throw new AppError(message, 400);
}

function getOptionalQueryValue(value: unknown, errorMessage: string): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string') return invalidQueryParameter(errorMessage);
  return value;
}

function parseMonth(value: string | undefined): string | undefined {
  if (value === undefined || value === '') return undefined;
  const month = normalizeYearMonth(value);
  if (!month) return invalidQueryParameter('InvalidMonth');
  return month;
}

function parseMemberId(value: string | undefined): number | undefined {
  if (value === undefined || value === '') return undefined;
  if (!/^[1-9]\d*$/.test(value)) return invalidQueryParameter('InvalidMemberId');
  const memberId = Number(value);
  if (!Number.isSafeInteger(memberId)) return invalidQueryParameter('InvalidMemberId');
  return memberId;
}

function parseLimit(value: string | undefined): number {
  if (value === undefined) return 20;
  if (!/^[1-9]\d*$/.test(value)) return invalidQueryParameter('InvalidLimit');
  const limit = Number(value);
  if (!Number.isSafeInteger(limit) || limit > 50) return invalidQueryParameter('InvalidLimit');
  return limit;
}

export const getJobStatus = asyncHandler(async (req, res) => {
  const { familyGroupId } = requireTenantContext();
  const jobId = getRouteParam(req, 'jobId');
  const job = await receiptQueue.getJob(jobId);
  if (!job) {
    const ledger = await findReceiptAnalysisJob(jobId, familyGroupId);
    if (!ledger) throw new AppError('ジョブが見つかりません。', 404);
    const state = ledger.status === 'FAILED' ? 'failed' : 'waiting';
    sendSuccess(res, { id: ledger.id, state, error: ledger.failureReason ?? undefined });
    return;
  }

  const jobFamilyGroupId = Number(job.data?.familyGroupId);
  if (!jobFamilyGroupId || jobFamilyGroupId !== familyGroupId) {
    throw new AppError('ジョブが見つかりません。', 404);
  }

  const state = await job.getState();
  const data = await enrichCompletedJobPayload(
    job,
    familyGroupId,
    mapJobToStatus(job, state)
  );

  sendSuccess(res, data);
});

export const getReceiptJobs = asyncHandler(async (_req, res) => {
  const ctx = requireTenantContext();
  const jobs = await listReceiptJobsForMember(ctx.familyGroupId, ctx.memberId);
  sendSuccess(res, jobs);
});

export const discardReceiptJob = asyncHandler(async (req, res) => {
  const ctx = requireTenantContext();
  await discardReceiptJobForMember(getRouteParam(req, 'jobId'), ctx.familyGroupId, ctx.memberId);
  sendMessage(res, 'Discarded');
});

export const retryReceiptJob = asyncHandler(async (req, res) => {
  if (isReceiptAnalysisMaintenanceMode()) throw new AppError('解析基盤を更新中です。しばらくしてから再実行してください。', 503);
  const ctx = requireTenantContext();
  const job = await retryFailedReceiptJobForMember(
    getRouteParam(req, 'jobId'),
    ctx.familyGroupId,
    ctx.memberId
  );
  sendSuccess(res, { jobId: String(job.id), status: 'queued' });
});

export const uploadReceipt = asyncHandler(async (req, res) => {
  if (isReceiptAnalysisMaintenanceMode()) throw new AppError('解析基盤を更新中です。しばらくしてから再試行してください。', 503);
  const file = req.file as Express.Multer.File | undefined;
  if (!file) throw new AppError('画像がアップロードされていません。', 400);

  const ctx = requireTenantContext();
  const { familyGroupId, memberId } = ctx;

  const timestamp = Date.now();
  const baseFileName = `receipt-${timestamp}-${Math.round(Math.random() * 1e9)}`;
  const uploadDir = 'uploads';
  const imagePath = path.join(uploadDir, `${baseFileName}.webp`);

  await sharp(file.buffer)
    .rotate()
    .resize(1000, 1000, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 75, effort: 6 })
    .toFile(imagePath);

  const job = await createReceiptAnalysisJob({ memberId, familyGroupId, imagePath });
  await enqueueReceiptAnalysisJob({ id: job.id, memberId, familyGroupId, imagePath });

  logger.info(`[Queue] 解析ジョブ登録: ID ${job.id} (世帯: ${familyGroupId}, 会員: ${memberId})`);

  sendSuccess(res, { ...mapUploadJobResponse(job.id), status: 'queued' }, 202);
});

export const commitReceipt = asyncHandler(async (req, res) => {
  const ctx = requireTenantContext();
  const { parsedData, imagePath, validation, jobId } = req.body;

  if (!parsedData || !imagePath) throw new AppError('必要なデータが不足しています。', 400);

  const result = await commitReceiptService({
    ctx,
    parsedData: parsedData as ReceiptCommitPayload,
    imagePath,
    isSuspicious: validation?.isSuspicious || false,
    warnings: validation?.warnings || [],
    jobId,
  });

  sendSuccess(res, mapReceiptToDetail(result), 201);
});

export const createReceipt = asyncHandler(async (req, res) => {
  const ctx = requireTenantContext();
  const { date, storeName, items, imagePath } = req.body;

  const newReceipt = await createManualReceipt(ctx, {
    date,
    storeName,
    items: items as ReceiptCreateItemInput[],
    imagePath,
  });

  sendSuccess(res, mapReceiptToDetail(newReceipt)!, 201);
});

export const updateReceipt = asyncHandler(async (req, res) => {
  const { familyGroupId } = requireTenantContext();
  const id = getRouteParam(req, 'id');
  const { date, storeName, items } = req.body;

  const result = await updateReceiptById(Number(id), familyGroupId, {
    date,
    storeName,
    items: items as ReceiptCreateItemInput[],
  });

  sendSuccess(res, mapReceiptToDetail(result)!);
});

export const updateItemCategory = asyncHandler(async (req, res) => {
  const { familyGroupId } = requireTenantContext();
  const id = getRouteParam(req, 'id');
  const { categoryId } = req.body;

  const result = await updateItemCategoryById(Number(id), familyGroupId, categoryId);
  sendSuccess(res, mapReceiptItemToDetail(result));
});

export const updateItemProductClassification = asyncHandler(async (req, res) => {
  const { familyGroupId, memberId } = requireTenantContext();
  const itemId = getRouteParam(req, 'itemId');
  const result = await correctItemProductClassification(Number(itemId), familyGroupId, memberId, req.body);
  sendSuccess(res, mapReceiptItemToDetail(result));
});

export const getItemProductClassificationCandidates = asyncHandler(async (req, res) => {
  const { familyGroupId } = requireTenantContext();
  const itemId = getRouteParam(req, 'itemId');
  const candidates = await listProductClassificationCandidates(Number(itemId), familyGroupId);
  sendSuccess(res, mapProductClassificationCandidatesToSummary(candidates));
});

export const getProductClassificationReviewItems = asyncHandler(async (req, res) => {
  const { familyGroupId } = requireTenantContext();
  const { status, categoryId, month } = req.query;
  const statuses = Array.isArray(status)
    ? status.filter((value): value is string => typeof value === 'string')
    : typeof status === 'string'
      ? [status]
      : undefined;
  const parsedCategoryId = typeof categoryId === 'string' ? Number(categoryId) : undefined;

  const items = await listProductClassificationReviewItems({
    familyGroupId,
    statuses,
    ...(parsedCategoryId && Number.isInteger(parsedCategoryId) ? { categoryId: parsedCategoryId } : {}),
    ...(typeof month === 'string' ? { month } : {}),
  });
  sendSuccess(res, mapProductClassificationReviewItems(items));
});

export const getReceipts = asyncHandler(async (req, res) => {
  const { familyGroupId } = requireTenantContext();
  const monthValue = getOptionalQueryValue(req.query.month, 'InvalidMonth');
  const memberIdValue = getOptionalQueryValue(req.query.memberId, 'InvalidMemberId');
  const queryValue = getOptionalQueryValue(req.query.q, 'InvalidQuery');
  const limitValue = getOptionalQueryValue(req.query.limit, 'InvalidLimit');
  const cursorValue = getOptionalQueryValue(req.query.cursor, 'InvalidCursor');
  const month = parseMonth(monthValue);
  const memberId = parseMemberId(memberIdValue);
  const query = queryValue ? getCleanText(queryValue) || undefined : undefined;
  const limit = parseLimit(limitValue);
  const filters: ReceiptPaginationFilters = { month, memberId, query };
  if (cursorValue === '') invalidQueryParameter('InvalidCursor');
  const cursor = cursorValue ? decodeReceiptCursor(cursorValue, filters) : undefined;
  const page = await listReceipts({
    familyGroupId,
    ...filters,
    limit,
    cursor,
  });
  sendSuccess(res, {
    items: mapReceiptList(page.receipts),
    nextCursor: page.nextCursor,
    hasNext: page.hasNext,
  });
});

export const getReceipt = asyncHandler(async (req, res) => {
  const { familyGroupId } = requireTenantContext();
  const receiptId = Number(getRouteParam(req, 'id'));
  if (!Number.isSafeInteger(receiptId) || receiptId < 1) {
    throw new AppError('InvalidReceiptId', 400);
  }

  const receipt = await getReceiptById(receiptId, familyGroupId);
  sendSuccess(res, mapReceiptToDetail(receipt));
});

export const getLatestReceipt = asyncHandler(async (_req, res) => {
  const { familyGroupId } = requireTenantContext();
  const receipt = await fetchLatestReceipt(familyGroupId);
  sendSuccess(res, mapReceiptToDetail(receipt));
});

export const deleteReceipt = asyncHandler(async (req, res) => {
  const { familyGroupId } = requireTenantContext();
  await deleteReceiptById(Number(getRouteParam(req, 'id')), familyGroupId);
  sendMessage(res, 'Deleted');
});

export const getMonthlyStats = asyncHandler(async (req, res) => {
  const { familyGroupId } = requireTenantContext();
  const month = (req.query.month as string) || new Date().toISOString().slice(0, 7);
  const data = await fetchMonthlyStats(familyGroupId, month);
  sendSuccess(res, mapMonthlyStatsToApi(data));
});

export const getAdvancedStats = asyncHandler(async (_req, res) => {
  const { familyGroupId } = requireTenantContext();
  const data = await fetchAdvancedStats(familyGroupId);
  sendSuccess(res, mapAdvancedStatsToApi(data));
});

export const getFamilyMembers = asyncHandler(async (_req, res) => {
  const { familyGroupId } = requireTenantContext();
  const members = await listFamilyMembers(familyGroupId);
  sendSuccess(res, mapFamilyMembersToSummary(members));
});

export const updateItemSplits = asyncHandler(async (req, res) => {
  const { familyGroupId } = requireTenantContext();
  const itemId = getRouteParam(req, 'itemId');
  const { splits } = req.body;

  const result = await updateItemSplitsById(
    Number(itemId),
    familyGroupId,
    splits as SplitInput[] | undefined
  );

  sendSuccess(res, mapItemSplitsUpdateResult(result));
});
