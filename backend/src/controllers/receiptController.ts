import { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { Prisma } from '@prisma/client';

// --- ユーティリティ・基盤 ---
import logger from '../utils/logger';
import { prisma } from '../utils/prismaClient'; // シングルトンを使用
import { AppError } from '../utils/appError';
import { getCleanText } from '../utils/normalizer';
import { receiptQueue } from '../queues/receiptQueue'; // [Issue #43]
import { saveReceiptData } from '../services/persistenceService';

/**
 * 📂 [Issue #43] ジョブのステータスを確認する
 */
export const getJobStatus = async (req: Request<{ jobId: string }>, res: Response, next: NextFunction) => {
  try {
    const { jobId } = req.params;
    
    // ★ 修正箇所: jobId! (末尾に ! を付与)
    // これにより string | undefined 型を string 型として強制的に扱います
    const job = await receiptQueue.getJob(jobId);

    if (!job) {
      throw new AppError('ジョブが見つかりません。', 404);
    }

    const state = await job.getState(); 
    const result = job.returnvalue;
    const reason = job.failedReason;

    res.status(200).json({
      success: true,
      data: {
        id: job.id!, // ここも同様に ! を付与
        state, 
        result: state === 'completed' ? result : null,
        error: state === 'failed' ? reason : null
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 📂 カテゴリーマスタ一覧を取得
 */
export const getCategories = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { id: 'asc' }
    });
    res.json({ success: true, data: categories });
  } catch (error) {
    next(error);
  }
};

/**
 * 📂 レシート解析・登録 (Gemini AI 非同期フロー)
 */
export const analyzeReceipt = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { memberId } = req.body;
    const imagePath = req.file?.path;

    if (!imagePath) {
      throw new AppError('画像がアップロードされていません', 400);
    }

    const job = await receiptQueue.add('analyze-receipt', {
      memberId: Number(memberId),
      imagePath: imagePath,
    });

    logger.info(`[Queue] 解析ジョブを登録しました: JobID ${job.id!}`);
    
    res.status(202).json({ 
      success: true, 
      message: '解析リクエストを受け付けました。',
      data: { jobId: job.id! } 
    });

  } catch (error: any) {
    next(error);
  }
};

/**
 * 📂 レシート手動登録
 */
export const createReceipt = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { memberId, date, storeName, totalAmount, items, imagePath, rawText } = req.body;

    const newReceipt = await saveReceiptData({
      memberId: Number(memberId),
      storeName,
      date: new Date(date),
      totalAmount: Number(totalAmount),
      imagePath: imagePath || "",
      rawText: rawText || "",
      items: items.map((item: any) => ({
        name: item.name,
        price: Number(item.price),
        quantity: item.quantity ? Number(item.quantity) : 1,
        categoryId: item.categoryId ? Number(item.categoryId) : null,
      })),
    });

    logger.info(`[RECEIPT_CREATED] ID: ${newReceipt.id} を登録しました`);
    res.status(201).json({ success: true, data: newReceipt });

  } catch (error: any) {
    if (error.statusCode === 409) {
      return next(new AppError('このレシートは既に登録済みです。', 409, { code: 'DUPLICATE_RECEIPT' }));
    }
    next(error);
  }
};

/**
 * 📂 アイテムのカテゴリーを更新
 */
export const updateItemCategory = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { categoryId } = req.body;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const currentItem = await tx.item.findUnique({
        where: { id: Number(id) },
        include: { receipt: true }
      });

      if (!currentItem) {
        throw new AppError('指定されたアイテムが見つかりません', 404);
      }

      const updatedItem = await tx.item.update({
        where: { id: Number(id) },
        data: { categoryId: categoryId ? Number(categoryId) : null },
        include: { category: true }
      });

      if (categoryId) {
        const cleanItemName = getCleanText(currentItem.name);
        const cleanStoreName = getCleanText(currentItem.receipt.storeName);

        await tx.productMaster.upsert({
          where: {
            name_storeName: {
              name: cleanItemName,
              storeName: cleanStoreName,
            }
          },
          update: { categoryId: Number(categoryId) },
          create: {
            name: cleanItemName,
            storeName: cleanStoreName,
            categoryId: Number(categoryId),
          }
        });
      }

      return updatedItem;
    });

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

/**
 * 📂 レシート一覧を取得
 */
export const getReceipts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { memberId, month } = req.query;
    const where: Prisma.ReceiptWhereInput = {};

    if (typeof memberId === 'string' && memberId.trim() !== '') {
      where.memberId = Number(memberId);
    }

    if (typeof month === 'string' && month.trim() !== '') {
      const start = new Date(`${month}-01T00:00:00.000Z`);
      const end = new Date(start);
      end.setMonth(start.getMonth() + 1);
      where.date = { gte: start, lt: end };
    }

    const receipts = await prisma.receipt.findMany({
      where,
      include: { items: { include: { category: true } } },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }]
    });

    res.json({ success: true, data: receipts });
  } catch (error) {
    next(error);
  }
};

/**
 * 📂 最新のレシート1件を取得
 */
export const getLatestReceipt = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { memberId } = req.query;
    
    if (!memberId) {
      return next(new AppError('memberId が必要です', 400));
    }

    const latest = await prisma.receipt.findFirst({
      where: { memberId: Number(memberId) },
      include: { items: { include: { category: true } } },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }]
    });

    res.json({ success: true, data: latest || null });
  } catch (error) {
    next(error);
  }
};

/**
 * 📂 レシートを削除
 */
export const deleteReceipt = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  try {
    const receipt = await prisma.receipt.findUnique({ where: { id: Number(id) } });
    if (!receipt) throw new AppError('対象が見つかりません', 404);

    if (receipt.imagePath) {
      const fullPath = path.join(__dirname, '../../', receipt.imagePath);
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    }

    await prisma.receipt.delete({ where: { id: Number(id) } });
    res.json({ success: true, message: '削除しました。' });
  } catch (error) {
    next(error);
  }
};

/**
 * 📂 月次統計を取得
 */
export const getMonthlyStats = async (req: Request, res: Response, next: NextFunction) => {
  const { month, memberId } = req.query; 
  try {
    const targetDate = month ? new Date(`${month as string}-01T00:00:00Z`) : new Date();
    const startOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
    const endOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0, 23, 59, 59);

    const mId = Number(memberId || 1);

    const stats = await prisma.item.groupBy({
      by: ['categoryId'],
      where: { receipt: { memberId: mId, date: { gte: startOfMonth, lte: endOfMonth } } },
      _sum: { price: true },
    });

    const categories = await prisma.category.findMany();
    const formattedStats = stats.map(s => {
      const category = categories.find(c => c.id === s.categoryId);
      return {
        categoryId: s.categoryId,
        categoryName: category ? category.name : '未分類',
        totalAmount: s._sum.price || 0,
        color: (category as any)?.color || '#999',
      };
    });

    res.json({
      success: true,
      data: {
        month: `${startOfMonth.getFullYear()}-${String(startOfMonth.getMonth() + 1).padStart(2, '0')}`,
        totalAmount: formattedStats.reduce((sum, s) => sum + s.totalAmount, 0),
        stats: formattedStats
      }
    });
  } catch (error) {
    next(error);
  }
};