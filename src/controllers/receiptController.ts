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

// 既存の saveParsedReceipt や processAndSaveReceipt もこのファイルにある場合は、
// それらの関数もこの下に維持してください。