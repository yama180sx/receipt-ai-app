import path from 'path';
import sharp from 'sharp';
import { AppError } from '../utils/appError';
import { receiptQueue } from '../queues/receiptQueue';
import { findCategoriesByFamilyGroup } from '../repositories/categoryRepository';
import {
  enrichCompletedJobPayload,
  listReceiptJobsForMember,
  discardReceiptJobForMember,
} from '../services/receiptJobService';
import { requireTenantContext } from '../utils/context';
import { getRouteParam } from '../utils/routeParams';
import { sendMessage, sendSuccess } from '../utils/sendApiResponse';
import { asyncHandler } from '../utils/asyncHandler';
import logger from '../utils/logger';
import type { ReceiptCommitPayload, ReceiptCreateItemInput } from '../types/receipt';
import {
  mapCategoriesToSummary,
  mapFamilyMembersToSummary,
  mapItemSplitsUpdateResult,
  mapJobToStatus,
  mapReceiptItemToDetail,
  mapReceiptList,
  mapReceiptToDetail,
  mapUploadJobResponse,
} from '../mappers/receiptMapper';
import { mapAdvancedStatsToApi, mapMonthlyStatsToApi } from '../mappers/statsMapper';
import { commitReceipt as commitReceiptService } from '../services/receipt/receiptCommitService';
import { createManualReceipt } from '../services/receipt/receiptUpdateService';
import {
  listReceipts,
  getLatestReceipt as fetchLatestReceipt,
  deleteReceiptById,
  listFamilyMembers,
} from '../services/receipt/receiptQueryService';
import { updateReceiptById, updateItemCategoryById } from '../services/receipt/receiptUpdateService';
import { updateItemSplitsById } from '../services/settlement/itemSplitService';
import {
  getMonthlyStats as fetchMonthlyStats,
  getAdvancedStats as fetchAdvancedStats,
} from '../services/receipt/receiptStatsService';
import { SplitInput } from '../services/settlement/itemSplitAllocation';

export const getJobStatus = asyncHandler(async (req, res) => {
  const { familyGroupId } = requireTenantContext();
  const job = await receiptQueue.getJob(getRouteParam(req, 'jobId'));
  if (!job) throw new AppError('ジョブが見つかりません。', 404);

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

export const getCategories = asyncHandler(async (_req, res) => {
  const { familyGroupId } = requireTenantContext();
  const categories = await findCategoriesByFamilyGroup(familyGroupId);
  sendSuccess(res, mapCategoriesToSummary(categories));
});

export const uploadReceipt = asyncHandler(async (req, res) => {
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

  const job = await receiptQueue.add('analyze-receipt', {
    memberId,
    familyGroupId,
    imagePath,
  });

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

export const getReceipts = asyncHandler(async (req, res) => {
  const { familyGroupId } = requireTenantContext();
  const { month, memberId } = req.query;
  const receipts = await listReceipts({
    familyGroupId,
    memberId: typeof memberId === 'string' ? memberId : undefined,
    month: typeof month === 'string' ? month : undefined,
  });
  sendSuccess(res, mapReceiptList(receipts));
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
