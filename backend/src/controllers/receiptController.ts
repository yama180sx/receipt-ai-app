import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';
import { saveReceiptData } from '../services/persistenceService';
import { getCleanText } from '../utils/normalizer';
import { prisma } from '../utils/prismaClient';
import { Prisma } from '@prisma/client';
import { AppError } from '../utils/appError';

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
 * 📂 レシート登録
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
    // 重複エラー（409）のハンドリングを共通エラー形式へ
    if (error.statusCode === 409) {
      return next(new AppError('このレシートは既に登録されている可能性があります。', 409, { code: 'DUPLICATE_RECEIPT' }));
    }
    next(error);
  }
};

/**
 * 📂 アイテムのカテゴリーを更新し、学習マスタへ反映する
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
        logger.debug(`[LEARNING] 学習完了: "${cleanItemName}" @ ${cleanStoreName} -> Cat:${categoryId}`);
      }

      return updatedItem;
    });

    logger.info(`[ITEM_UPDATE] ID: ${id} のカテゴリーを更新しました`);
    res.json({ success: true, data: result });

  } catch (error) {
    next(error);
  }
};

/**
 * 📂 レシート一覧を取得（履歴一覧画面用）
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
      select: {
        id: true,
        memberId: true,
        storeName: true,
        date: true,
        totalAmount: true,
        imagePath: true,
        items: {
          select: {
            id: true,
            name: true,
            price: true,
            quantity: true,
            categoryId: true,
            category: {
              select: { id: true, name: true, color: true }
            }
          }
        }
      },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }]
    });

    // ★ ここが履歴一覧表示の鍵
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
      select: {
        id: true,
        memberId: true,
        storeName: true,
        date: true,
        totalAmount: true,
        imagePath: true,
        items: {
          select: {
            id: true,
            name: true,
            price: true,
            quantity: true,
            categoryId: true,
            category: {
              select: { id: true, name: true, color: true }
            }
          }
        }
      },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }]
    });

    res.json({ success: true, data: latest || null });

  } catch (error) {
    next(error);
  }
};

/**
 * 📂 レシートを削除する
 */
export const deleteReceipt = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;

  try {
    const deleted = await prisma.receipt.delete({
      where: { id: Number(id) }
    });

    logger.info(`[RECEIPT_DELETED] ID: ${id} を削除しました`);
    res.json({ success: true, data: { id: deleted.id } });
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
    const startOfPrevMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() - 1, 1);
    const endOfPrevMonth = new Date(targetDate.getFullYear(), targetDate.getMonth(), 0, 23, 59, 59);

    const mId = Number(memberId || 1);

    const stats = await prisma.item.groupBy({
      by: ['categoryId'],
      where: { receipt: { memberId: mId, date: { gte: startOfMonth, lte: endOfMonth } } },
      _sum: { price: true },
    });

    const prevMonthTotal = await prisma.item.aggregate({
      where: { receipt: { memberId: mId, date: { gte: startOfPrevMonth, lte: endOfPrevMonth } } },
      _sum: { price: true },
    });

    const latestReceipt = await prisma.receipt.findFirst({
      where: { memberId: mId, date: { gte: startOfMonth, lte: endOfMonth }, imagePath: { not: null } },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, imagePath: true, storeName: true, totalAmount: true,
        items: {
          select: { id: true, name: true, price: true, categoryId: true, category: { select: { name: true, color: true } } }
        }
      }
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

    const currentTotal = formattedStats.reduce((sum, s) => sum + s.totalAmount, 0);
    const prevTotal = prevMonthTotal._sum.price || 0;

    res.json({
      success: true,
      data: {
        month: `${startOfMonth.getFullYear()}-${String(startOfMonth.getMonth() + 1).padStart(2, '0')}`,
        totalAmount: currentTotal,
        prevTotal: prevTotal,
        diffAmount: currentTotal - prevTotal,
        diffPercentage: prevTotal !== 0 ? Math.round(((currentTotal - prevTotal) / prevTotal) * 100) : 0,
        stats: formattedStats,
        latestReceipt: latestReceipt 
      }
    });
  } catch (error) {
    next(error);
  }
};