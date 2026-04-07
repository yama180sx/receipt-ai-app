import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';

import logger from '../utils/logger';
import { prisma } from '../utils/prismaClient'; 
import { AppError } from '../utils/appError';
import { getCleanText } from '../utils/normalizer';
import { receiptQueue } from '../queues/receiptQueue';
import { saveReceiptData } from '../services/persistenceService';
import { getFamilyGroupId } from '../utils/context';

/**
 * [Issue #43] ジョブステータス取得 (ポーリング用)
 */
export const getJobStatus = async (req: Request<{ jobId: string }>, res: Response, next: NextFunction) => {
  try {
    const job = await receiptQueue.getJob(req.params.jobId!);
    if (!job) throw new AppError('ジョブが見つかりません。', 404);

    const state = await job.getState();
    res.status(200).json({
      success: true,
      data: {
        id: job.id,
        state,
        result: job.returnvalue,
        error: job.failedReason
      }
    });
  } catch (error) { next(error); }
};

/**
 * [Issue #45] カテゴリ一覧取得 (世帯共通マスタ)
 */
export const getCategories = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const categories = await prisma.category.findMany({ orderBy: { id: 'asc' } });
    res.json({ success: true, data: categories });
  } catch (error) { next(error); }
};

/**
 * [Issue #43 & #45] レシートアップロード (ジョブ登録)
 * 修正内容: memberId を req.body ではなく req.headers から取得するように変更
 */
export const uploadReceipt = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // ★ 重要: Multipart/form-data では body よりも header (x-member-id) の方が確実に取得できます
    const memberId = req.headers['x-member-id'];
    const imagePath = req.file?.path;

    if (!imagePath) throw new AppError('画像がアップロードされていません。', 400);
    if (!memberId) throw new AppError('メンバーIDが指定されていません。', 400);

    const job = await receiptQueue.add('analyze-receipt', {
      memberId: Number(memberId),
      familyGroupId: getFamilyGroupId(), // Middlewareがセットしたコンテキストを使用
      imagePath,
    });

    res.status(202).json({ success: true, data: { jobId: job.id } });
  } catch (error) { next(error); }
};

/**
 * 手動登録
 */
export const createReceipt = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // 手動登録は通常の JSON POST なので body から取得、念のため header もフォールバック
    const memberId = req.body.memberId || req.headers['x-member-id'];
    const { date, storeName, totalAmount, items, imagePath, rawText } = req.body;

    const newReceipt = await saveReceiptData({
      memberId: Number(memberId),
      familyGroupId: getFamilyGroupId(),
      storeName,
      date: new Date(date),
      totalAmount: Number(totalAmount),
      imagePath: imagePath || "",
      rawText: rawText || "",
      items: items.map((i: any) => ({ ...i, price: Number(i.price) })),
    });
    res.status(201).json({ success: true, data: newReceipt });
  } catch (error) { next(error); }
};

/**
 * [Issue #45] 明細カテゴリ更新 ＋ 世帯別学習
 */
export const updateItemCategory = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { categoryId } = req.body;
  const familyGroupId = getFamilyGroupId();

  try {
    const result = await prisma.$transaction(async (tx) => {
      const currentItem = await tx.item.findUnique({
        where: { id: Number(id) },
        include: { receipt: true }
      });

      if (!currentItem) throw new AppError('ItemNotFound', 404);

      const updatedItem = await tx.item.update({
        where: { id: Number(id) },
        data: { categoryId: categoryId ? Number(categoryId) : null },
        include: { category: true }
      });

      if (categoryId) {
        // [Issue #45] 世帯別の学習マスタに保存
        await (tx.productMaster as any).upsert({
          where: {
            name_storeName_familyGroupId: {
              name: getCleanText(currentItem.name),
              storeName: getCleanText(currentItem.receipt.storeName),
              familyGroupId
            }
          },
          update: { categoryId: Number(categoryId) },
          create: {
            name: getCleanText(currentItem.name),
            storeName: getCleanText(currentItem.receipt.storeName),
            categoryId: Number(categoryId),
            familyGroupId
          }
        });
      }
      return updatedItem;
    });
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
};

/**
 * [Issue #45] レシート一覧取得 (世帯フィルタリング)
 */
export const getReceipts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const memberId = req.query.memberId || req.headers['x-member-id'];
    const { month } = req.query;
    const familyGroupId = getFamilyGroupId();
    
    const where: any = { familyGroupId };
    if (memberId) where.memberId = Number(memberId);
    
    if (typeof month === 'string' && month) {
      const start = new Date(`${month}-01`);
      const end = new Date(start);
      end.setMonth(start.getMonth() + 1);
      where.date = { gte: start, lt: end };
    }

    const receipts = await prisma.receipt.findMany({
      where,
      include: { items: { include: { category: true } } },
      orderBy: { date: 'desc' }
    });
    res.json({ success: true, data: receipts });
  } catch (error) { next(error); }
};

/**
 * 最新1件の取得
 */
export const getLatestReceipt = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const receipt = await prisma.receipt.findFirst({
      where: { familyGroupId: getFamilyGroupId() },
      orderBy: { createdAt: 'desc' },
      include: { items: { include: { category: true } } }
    });
    res.json({ success: true, data: receipt });
  } catch (error) { next(error); }
};

/**
 * 削除
 */
export const deleteReceipt = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.receipt.delete({ 
      where: { id: Number(req.params.id) } 
    });
    res.json({ success: true, message: 'Deleted' });
  } catch (error) { next(error); }
};

/**
 * 月別統計
 */
export const getMonthlyStats = async (_req: Request, res: Response, next: NextFunction) => {
  const fId = getFamilyGroupId();
  try {
    const stats = await prisma.$queryRaw`
      SELECT 
        TO_CHAR(date, 'YYYY-MM') as month, 
        SUM("totalAmount")::int as total 
      FROM "Receipt" 
      WHERE "familyGroupId" = ${fId} 
      GROUP BY month 
      ORDER BY month DESC
    `;
    res.json({ success: true, data: stats });
  } catch (error) { next(error); }
};

/**
 * 高度な統計 (トレンド分析)
 */
export const getAdvancedStats = async (_req: Request, res: Response, next: NextFunction) => {
  const fId = getFamilyGroupId();
  try {
    const trend = await prisma.$queryRaw`
      SELECT 
        TO_CHAR(date, 'YYYY-MM') as period, 
        SUM("totalAmount")::int as total 
      FROM "Receipt" 
      WHERE "familyGroupId" = ${fId} 
      GROUP BY period 
      ORDER BY period DESC 
      LIMIT 6
    `;
    res.json({ success: true, data: { trend, pareto: [] } });
  } catch (error) { next(error); }
};