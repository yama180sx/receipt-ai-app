import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prismaClient';
import logger from '../utils/logger';
import { AppError } from '../utils/appError';
import { getFamilyGroupId } from '../utils/context';

/**
 * 📂 学習マスタ一覧取得
 */
export const getProductMasters = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { q, store } = req.query;
    const familyGroupId = getFamilyGroupId();
    
    const where: any = { familyGroupId };
    if (q) where.name = { contains: String(q), mode: 'insensitive' };
    if (store) where.storeName = { contains: String(store), mode: 'insensitive' };

    const masters = await prisma.productMaster.findMany({
      where,
      include: { category: true },
      // ★ 修正: updatedAt は存在しないため id で降順ソート
      orderBy: { id: 'desc' },
      take: 100 
    });

    res.json({
      success: true,
      data: masters
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 📂 マスタの個別更新
 */
export const updateProductMaster = async (req: Request, res: Response, next: NextFunction) => {
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

    res.json({
      success: true,
      data: updated
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 📂 店舗名の統合ロジック (世帯分離対応)
 */
export const mergeStoreNames = async (req: Request, res: Response, next: NextFunction) => {
  const { sourceStoreName, targetStoreName } = req.body;
  const familyGroupId = getFamilyGroupId();

  if (!sourceStoreName || !targetStoreName) {
    return next(new AppError('統合元と統合先の指定が必要です', 400));
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. [Issue #45] 当該世帯の ProductMaster のみ置換
      const updateResult = await tx.productMaster.updateMany({
        where: { 
          storeName: sourceStoreName,
          familyGroupId 
        },
        data: { storeName: targetStoreName }
      });

      // 2. [Issue #45] 当該世帯の Receipt データのみ書き換え
      await tx.receipt.updateMany({
        where: { 
          storeName: sourceStoreName,
          familyGroupId
        },
        data: { storeName: targetStoreName }
      });

      return updateResult;
    });

    logger.info(`[STORE_MERGE] Family:${familyGroupId} | ${sourceStoreName} -> ${targetStoreName}`);
    
    res.json({
      success: true,
      data: {
        message: '統合が完了しました',
        count: result.count
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 📂 マスタ削除
 */
export const deleteProductMaster = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  try {
    await prisma.productMaster.delete({ 
      where: { id: Number(id) } 
    });

    res.json({
      success: true,
      message: '削除しました'
    });
  } catch (error) {
    next(error);
  }
};