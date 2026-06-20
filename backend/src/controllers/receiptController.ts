import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prismaClient';
import { AppError } from '../utils/appError';
import { receiptQueue } from '../queues/receiptQueue';
import {
  enrichCompletedJobPayload,
  listReceiptJobsForMember,
  discardReceiptJobForMember,
} from '../services/receiptJobService';
import { requireTenantContext } from '../utils/context';
import { getRouteParam } from '../utils/routeParams';
import type { ReceiptCommitPayload, ReceiptCreateItemInput } from '../types/receipt';
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
    let data: Record<string, unknown> = {
      id: job.id,
      state,
      result: job.returnvalue,
      error: job.failedReason,
    };
    data = await enrichCompletedJobPayload(job, familyGroupId, data);

    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const getReceiptJobs = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const ctx = requireTenantContext();
    const jobs = await listReceiptJobsForMember(ctx.familyGroupId, ctx.memberId);
    res.status(200).json({ success: true, data: jobs });
  } catch (error) {
    next(error);
  }
};

export const discardReceiptJob = async (req: Request<{ jobId: string }>, res: Response, next: NextFunction) => {
  try {
    const ctx = requireTenantContext();
    await discardReceiptJobForMember(getRouteParam(req, 'jobId'), ctx.familyGroupId, ctx.memberId);
    res.status(200).json({ success: true, message: 'Discarded' });
  } catch (error) {
    next(error);
  }
};

export const getCategories = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const categories = await prisma.category.findMany({ orderBy: { id: 'asc' } });
    res.json({ success: true, data: categories });
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

    res.status(202).json({ success: true, data: { jobId: job.id } });
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

    res.status(201).json({ success: true, data: result });
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

    res.status(201).json({ success: true, data: newReceipt });
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

    res.json({ success: true, data: result });
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
    res.json({ success: true, data: result });
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
    res.json({ success: true, data: receipts });
  } catch (error) {
    next(error);
  }
};

export const getLatestReceipt = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const { familyGroupId } = requireTenantContext();
    const receipt = await fetchLatestReceipt(familyGroupId);
    res.json({ success: true, data: receipt });
  } catch (error) {
    next(error);
  }
};

export const deleteReceipt = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { familyGroupId } = requireTenantContext();
    await deleteReceiptById(Number(getRouteParam(req, 'id')), familyGroupId);
    res.json({ success: true, message: 'Deleted' });
  } catch (error) {
    next(error);
  }
};

export const getMonthlyStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { familyGroupId } = requireTenantContext();
    const month = (req.query.month as string) || new Date().toISOString().slice(0, 7);
    const data = await fetchMonthlyStats(familyGroupId, month);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const getAdvancedStats = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const { familyGroupId } = requireTenantContext();
    const data = await fetchAdvancedStats(familyGroupId);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const getFamilyMembers = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const { familyGroupId } = requireTenantContext();
    const members = await listFamilyMembers(familyGroupId);
    res.json({ success: true, data: members });
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

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};
