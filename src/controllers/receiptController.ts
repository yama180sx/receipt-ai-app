import { Request, Response } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
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
 * レシート一覧を取得（Issue #13: 履歴画面用）
 * クエリ例: /api/receipts?memberId=1&month=2026-02
 */
export const getReceipts = async (req: Request, res: Response) => {
  try {
    const { memberId, month } = req.query;

    const where: Prisma.ReceiptWhereInput = {};

    // memberId フィルタ（指定があれば数値に変換）
    if (typeof memberId === 'string' && memberId.trim() !== '') {
      const memberIdNum = Number(memberId);
      if (Number.isNaN(memberIdNum)) {
        return res.status(400).json({ error: 'memberId は数値で指定してください' });
      }
      where.memberId = memberIdNum;
    }

    // month フィルタ（YYYY-MM を想定）
    if (typeof month === 'string' && month.trim() !== '') {
      const monthMatch = month.match(/^\d{4}-\d{2}$/);
      if (!monthMatch) {
        return res.status(400).json({ error: 'month は YYYY-MM 形式で指定してください' });
      }

      const start = new Date(`${month}-01T00:00:00.000Z`);
      const end = new Date(start);
      end.setMonth(start.getMonth() + 1);

      where.date = {
        gte: start,
        lt: end,
      };
    }

    // rawText などの巨大フィールドは一覧には不要なため返さない（モバイルのメモリ圧迫対策）
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
              select: {
                id: true,
                name: true,
                color: true,
              }
            }
          }
        }
      },
      orderBy: [
        { date: 'desc' },
        { createdAt: 'desc' },
      ]
    });

    res.json(receipts);
  } catch (error: any) {
    logger.error(`[GET_RECEIPTS_ERROR] ${error.message}`, { error });
    res.status(500).json({ error: 'レシート一覧の取得に失敗しました' });
  }
};