import { Request, Response, NextFunction } from 'express';
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
import type { ReceiptCommitPayload, ReceiptCreateItemInput } from '../types/receipt';
import {
  mapAdvancedStatsToApi,
  mapCategoriesToSummary,
  mapFamilyMembersToSummary,
  mapItemSplitsUpdateResult,
  mapJobToStatus,
  mapMonthlyStatsToApi,
  mapReceiptItemToDetail,
  mapReceiptList,
  mapReceiptToDetail,
  mapUploadJobResponse,
} from '../mappers/receiptMapper';
import { commitReceipt as commitReceiptService } from '../services/receipt/receiptCommitService';
import { createManualReceipt } from '../services/receipt/receiptUpdateService';
import {
  listReceipts,
  getLatestReceipt as fetchLatestReceipt,
  deleteReceiptById,
  listFamilyMembers,
} from '../services/receipt/receiptQueryService';
import { updateReceiptById, updateItemCategoryById } from '../services/receipt/receiptUpdateService';
import { updateItemSplitsById } from '../services/receipt/receiptSplitService';
import {
  getMonthlyStats as fetchMonthlyStats,
  getAdvancedStats as fetchAdvancedStats,
} from '../services/receipt/receiptStatsService';
import { SplitInput } from '../utils/itemSplitAllocation';

export const getJobStatus = async (req: Request<{ jobId: string }>, res: Response, next: NextFunction) => {
  try {
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
  } catch (error) {
    next(error);
  }
};

export const getReceiptJobs = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const ctx = requireTenantContext();
    const jobs = await listReceiptJobsForMember(ctx.familyGroupId, ctx.memberId);
    sendSuccess(res, jobs);
  } catch (error) {
    next(error);
  }
};

export const discardReceiptJob = async (req: Request<{ jobId: string }>, res: Response, next: NextFunction) => {
  try {
    const ctx = requireTenantContext();
    await discardReceiptJobForMember(getRouteParam(req, 'jobId'), ctx.familyGroupId, ctx.memberId);
    sendMessage(res, 'Discarded');
  } catch (error) {
    next(error);
  }
};

export const getCategories = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const { familyGroupId } = requireTenantContext();
    const categories = await findCategoriesByFamilyGroup(familyGroupId);
    sendSuccess(res, mapCategoriesToSummary(categories));
  } catch (error) {
    next(error);
  }
};

export const uploadReceipt = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ctx = requireTenantContext();
    const imagePath = req.file?.path;

    if (!imagePath) throw new AppError('画像がアップロードされていません。', 400);

    const job = await receiptQueue.add('analyze-receipt', {
      memberId: ctx.memberId,
      familyGroupId: ctx.familyGroupId,
      imagePath,
    });

    sendSuccess(res, mapUploadJobResponse(job.id), 202);
  } catch (error) {
    next(error);
  }
};

export const commitReceipt = async (req: Request, res: Response, next: NextFunction) => {
  try {
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
  } catch (error) {
    next(error);
  }
};

export const createReceipt = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ctx = requireTenantContext();
    const { date, storeName, items, imagePath } = req.body;

    const newReceipt = await createManualReceipt(ctx, {
      date,
      storeName,
      items: items as ReceiptCreateItemInput[],
      imagePath,
    });

    sendSuccess(res, mapReceiptToDetail(newReceipt)!, 201);
  } catch (error) {
    next(error);
  }
};

export const updateReceipt = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { familyGroupId } = requireTenantContext();
    const id = getRouteParam(req, 'id');
    const { date, storeName, items } = req.body;

    const result = await updateReceiptById(Number(id), familyGroupId, {
      date,
      storeName,
      items: items as ReceiptCreateItemInput[],
    });

    sendSuccess(res, mapReceiptToDetail(result)!);
  } catch (error) {
    next(error);
  }
};

export const updateItemCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { familyGroupId } = requireTenantContext();
    const id = getRouteParam(req, 'id');
    const { categoryId } = req.body;

    const result = await updateItemCategoryById(Number(id), familyGroupId, categoryId);
    sendSuccess(res, mapReceiptItemToDetail(result));
  } catch (error) {
    next(error);
  }
};

export const getReceipts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { familyGroupId } = requireTenantContext();
    const { month, memberId } = req.query;
    const receipts = await listReceipts({
      familyGroupId,
      memberId: typeof memberId === 'string' ? memberId : undefined,
      month: typeof month === 'string' ? month : undefined,
    });
    sendSuccess(res, mapReceiptList(receipts));
  } catch (error) {
    next(error);
  }
};

export const getLatestReceipt = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const { familyGroupId } = requireTenantContext();
    const receipt = await fetchLatestReceipt(familyGroupId);
    sendSuccess(res, mapReceiptToDetail(receipt));
  } catch (error) {
    next(error);
  }
};

export const deleteReceipt = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { familyGroupId } = requireTenantContext();
    await deleteReceiptById(Number(getRouteParam(req, 'id')), familyGroupId);
    sendMessage(res, 'Deleted');
  } catch (error) {
    next(error);
  }
};

export const getMonthlyStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { familyGroupId } = requireTenantContext();
    const month = (req.query.month as string) || new Date().toISOString().slice(0, 7);
    const data = await fetchMonthlyStats(familyGroupId, month);
    sendSuccess(res, mapMonthlyStatsToApi(data));
  } catch (error) {
    next(error);
  }
};

export const getAdvancedStats = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const { familyGroupId } = requireTenantContext();
    const data = await fetchAdvancedStats(familyGroupId);
    sendSuccess(res, mapAdvancedStatsToApi(data));
  } catch (error) {
    next(error);
  }
};

export const getFamilyMembers = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const { familyGroupId } = requireTenantContext();
    const members = await listFamilyMembers(familyGroupId);
    sendSuccess(res, mapFamilyMembersToSummary(members));
  } catch (error) {
    next(error);
  }
};

export const updateItemSplits = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { familyGroupId } = requireTenantContext();
    const itemId = getRouteParam(req, 'itemId');
    const { splits } = req.body;

    const result = await updateItemSplitsById(
      Number(itemId),
      familyGroupId,
      splits as SplitInput[] | undefined
    );

    sendSuccess(res, mapItemSplitsUpdateResult(result));
  } catch (error) {
    next(error);
  }
};
