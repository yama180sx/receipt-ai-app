import { Request, Response } from 'express';
import { prisma } from '../utils/prismaClient';
import logger from '../utils/logger';

/**
 * 学習マスタ一覧取得（検索・ページネーション対応）
 */
export const getProductMasters = async (req: Request, res: Response) => {
  try {
    const { q, store } = req.query;
    
    const where: any = {};
    if (q) where.name = { contains: String(q), mode: 'insensitive' };
    if (store) where.storeName = { contains: String(store), mode: 'insensitive' };

    const masters = await prisma.productMaster.findMany({
      where,
      include: { category: true },
      orderBy: { updatedAt: 'desc' },
      take: 100 // ひとまず100件
    });

    res.json(masters);
  } catch (error) {
    res.status(500).json({ error: 'マスタ取得失敗' });
  }
};

/**
 * マスタの個別更新
 */
export const updateProductMaster = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, storeName, categoryId } = req.body;

  try {
    const updated = await prisma.productMaster.update({
      where: { id: Number(id) },
      data: { 
        name, 
        storeName, 
        categoryId: Number(categoryId) 
      }
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'マスタ更新失敗' });
  }
};

/**
 * 店舗名の統合ロジック（エイリアス整理）
 * 例: "セブン" を "セブン-イレブン" に統合する
 */
export const mergeStoreNames = async (req: Request, res: Response) => {
  const { sourceStoreName, targetStoreName } = req.body;

  if (!sourceStoreName || !targetStoreName) {
    return res.status(400).json({ error: '統合元と統合先の指定が必要です' });
  }

  try {
    // トランザクションで一括更新
    const result = await prisma.$transaction(async (tx) => {
      // 1. ProductMaster 内の店舗名を一括置換
      const updatedCount = await tx.productMaster.updateMany({
        where: { storeName: sourceStoreName },
        data: { storeName: targetStoreName }
      });

      // 2. 必要に応じて過去の Receipt データの店舗名も書き換える（任意）
      await tx.receipt.updateMany({
        where: { storeName: sourceStoreName },
        data: { storeName: targetStoreName }
      });

      return updatedCount;
    });

    logger.info(`[STORE_MERGE] ${sourceStoreName} -> ${targetStoreName} (${result.count} items)`);
    res.json({ message: '統合が完了しました', count: result.count });
  } catch (error) {
    logger.error(`[STORE_MERGE_ERROR] ${error}`);
    res.status(500).json({ error: '統合処理に失敗しました' });
  }
};

/**
 * マスタ削除
 */
export const deleteProductMaster = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await prisma.productMaster.delete({ where: { id: Number(id) } });
    res.json({ message: '削除しました' });
  } catch (error) {
    res.status(500).json({ error: '削除失敗' });
  }
};