import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prismaClient';
import { AppError } from '../utils/appError';
import { receiptQueue } from '../queues/receiptQueue';
import {
  enrichCompletedJobPayload,
  listReceiptJobsForMember,
  discardReceiptJobForMember,
} from '../services/receiptJobService';
import { getFamilyGroupId, getMemberId } from '../utils/context';
import { getRouteParam } from '../utils/routeParams';
import type { ReceiptCommitPayload, ReceiptCreateItemInput } from '../types/receipt';
import { isDuplicateReceiptError, getDuplicateExistingId } from '../services/receipt/receiptDuplicateError';
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

function handleDuplicateOrNext(error: unknown, res: Response, next: NextFunction): void {
  if (isDuplicateReceiptError(error)) {
    res.status(409).json({
      success: false,
      message: 'DUPLICATE',
      existingId: getDuplicateExistingId(error),
    });
    return;
  }
  next(error);
}

export const getJobStatus = async (req: Request<{ jobId: string }>, res: Response, next: NextFunction) => {
  try {
    const familyGroupId = getFamilyGroupId();
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
    const familyGroupId = getFamilyGroupId();
    const memberId = getMemberId();
    if (!memberId) throw new AppError('メンバーIDが指定されていません。', 400);

    const jobs = await listReceiptJobsForMember(familyGroupId, Number(memberId));
    res.status(200).json({ success: true, data: jobs });
  } catch (error) {
    next(error);
  }
};

export const discardReceiptJob = async (req: Request<{ jobId: string }>, res: Response, next: NextFunction) => {
  try {
    const familyGroupId = getFamilyGroupId();
    const memberId = getMemberId();
    if (!memberId) throw new AppError('メンバーIDが指定されていません。', 400);

    await discardReceiptJobForMember(getRouteParam(req, 'jobId'), familyGroupId, Number(memberId));
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
    const memberId = getMemberId();
    const familyGroupId = getFamilyGroupId();
    const imagePath = req.file?.path;

    if (!imagePath) throw new AppError('画像がアップロードされていません。', 400);
    if (!memberId) throw new AppError('メンバーIDが指定されていません。', 400);

    const job = await receiptQueue.add('analyze-receipt', {
      memberId: Number(memberId),
      familyGroupId,
      imagePath,
    });

    res.status(202).json({ success: true, data: { jobId: job.id } });
  } catch (error) {
    next(error);
  }
};

export const commitReceipt = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const memberId = getMemberId();
    const familyGroupId = getFamilyGroupId();
    const { parsedData, imagePath, validation, jobId } = req.body;

    if (!parsedData || !imagePath) throw new AppError('必要なデータが不足しています。', 400);
    if (!memberId || !familyGroupId) throw new AppError('認証情報または世帯情報が取得できません。', 401);

    const result = await commitReceiptService({
      memberId,
      familyGroupId,
      parsedData: parsedData as ReceiptCommitPayload,
      imagePath,
      isSuspicious: validation?.isSuspicious || false,
      warnings: validation?.warnings || [],
      jobId,
    });

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    handleDuplicateOrNext(error, res, next);
  }
};

export const createReceipt = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const memberId = getMemberId();
    const familyGroupId = getFamilyGroupId();
    const { date, storeName, items, imagePath } = req.body;

    const newReceipt = await createManualReceipt(Number(memberId), familyGroupId, {
      date,
      storeName,
      items: items as ReceiptCreateItemInput[],
      imagePath,
    });

    res.status(201).json({ success: true, data: newReceipt });
  } catch (error) {
    handleDuplicateOrNext(error, res, next);
  }
};

export const updateReceipt = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = getRouteParam(req, 'id');
    const { date, storeName, items } = req.body;
    const familyGroupId = getFamilyGroupId();

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
    const id = getRouteParam(req, 'id');
    const { categoryId } = req.body;
    const familyGroupId = getFamilyGroupId();

    const result = await updateItemCategoryById(Number(id), familyGroupId, categoryId);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const getReceipts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { month, memberId } = req.query;
    const receipts = await listReceipts({
      familyGroupId: getFamilyGroupId(),
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
    const receipt = await fetchLatestReceipt(getFamilyGroupId());
    res.json({ success: true, data: receipt });
  } catch (error) {
    next(error);
  }
};

export const deleteReceipt = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await deleteReceiptById(Number(getRouteParam(req, 'id')));
    res.json({ success: true, message: 'Deleted' });
  } catch (error) {
    next(error);
  }
};

export const getMonthlyStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const familyGroupId = getFamilyGroupId();
    const month = (req.query.month as string) || new Date().toISOString().slice(0, 7);
    const data = await fetchMonthlyStats(familyGroupId, month);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const getAdvancedStats = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await fetchAdvancedStats(getFamilyGroupId());
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const getFamilyMembers = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const familyGroupId = getFamilyGroupId();
    if (!familyGroupId) throw new AppError('世帯情報が取得できません。', 400);

    const members = await listFamilyMembers(familyGroupId);
    res.json({ success: true, data: members });
  } catch (error) {
    next(error);
  }
};

export const updateItemSplits = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const itemId = getRouteParam(req, 'itemId');
    const { splits } = req.body;
    const familyGroupId = getFamilyGroupId();

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
