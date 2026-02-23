import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger';

const prisma = new PrismaClient();

/**
 * カテゴリーマスタ一覧を取得
 */
export const getCategories = async (_req: Request, res: Response) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { id: 'asc' }
    });
    res.json(categories);
  } catch (error) {
    logger.error(`[GET_CATEGORIES_ERROR] ${error}`);
    res.status(500).json({ error: 'カテゴリー一覧の取得に失敗しました' });
  }
};

/**
 * アイテムのカテゴリーを個別に更新する
 */
export const updateItemCategory = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { categoryId } = req.body;

  try {
    const updatedItem = await prisma.item.update({
      where: { id: Number(id) },
      data: { 
        categoryId: categoryId ? Number(categoryId) : null 
      },
      include: { 
        category: true 
      }
    });

    logger.info(`[ITEM_UPDATE] ID: ${id} のカテゴリーを ${updatedItem.category?.name || '未分類'} に更新しました`);
    res.json(updatedItem);
  } catch (error: any) {
    logger.error(`[ITEM_UPDATE_ERROR] ${error.message}`);
    res.status(500).json({ error: 'カテゴリーの更新に失敗しました' });
  }
};

/**
 * レシート一覧を取得（Issue #12）
 */
export const getReceipts = async (req: Request, res: Response) => {
  try {
    const { memberId, month } = req.query; // フィルタリング用

    const where: any = {};
    if (memberId) where.memberId = Number(memberId);
    if (month) {
      // 月指定 (YYYY-MM) がある場合の絞り込みロジック
      const start = new Date(`${month}-01T00:00:00.000Z`);
      const end = new Date(start);
      end.setMonth(start.getMonth() + 1);
      where.date = { gte: start, lt: end };
    }

    const receipts = await prisma.receipt.findMany({
      where,
      include: {
        items: {
          include: { category: true }
        }
      },
      orderBy: { date: 'desc' } // 新しい順
    });

    res.json(receipts);
  } catch (error: any) {
    logger.error(`[GET_RECEIPTS_ERROR] ${error.message}`);
    res.status(500).json({ error: 'レシート一覧の取得に失敗しました' });
  }
};