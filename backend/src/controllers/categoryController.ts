import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prismaClient'; // テナント拡張済みのインスタンスを使用
import { AppError } from '../utils/appError';
import logger from '../utils/logger';

/**
 * 📂 カテゴリー一覧取得
 */
export const getCategories = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const categories = await prisma.category.findMany({ 
      orderBy: { id: 'asc' } 
    });
    
    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 📂 カテゴリー新規追加
 */
export const createCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, color } = req.body;

    if (!name) {
      return next(new AppError('Name is required', 400));
    }

    const category = await prisma.category.create({
      data: { 
        name, 
        color: color || '#2ecc71' 
      }
    });

    logger.info(`[CATEGORY] Created: ${name}`);

    res.status(201).json({
      success: true,
      data: category
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 📂 カテゴリー削除
 */
export const deleteCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    await prisma.category.delete({
      where: { id: Number(id) }
    });

    logger.info(`[CATEGORY] Deleted: ID ${id}`);

    res.json({
      success: true
    });
  } catch (error: any) {
    if (error.code === 'P2003') {
      return next(new AppError('このカテゴリーは既に使用されているため削除できません。', 400));
    }
    next(error);
  }
};

/**
 * [Issue #48] 📂 カテゴリーキーワードの統計的最適化
 * ProductMasterから頻出する品名を抽出し、Categoryマスタのキーワードを補強します。
 */
export const optimizeKeywords = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // 1. 全世帯のProductMasterから頻出品名を集計 (出現回数 5回以上)
    // ※ 統計処理のため familyGroupId のフィルタリングを一時的にバイパス、あるいは全件対象とする
    const stats = await prisma.productMaster.groupBy({
      by: ['name', 'categoryId'],
      _count: {
        name: true,
      },
      having: {
        name: {
          _count: {
            gte: 5,
          },
        },
      },
    });

    const categories = await prisma.category.findMany();
    let totalAdded = 0;

    // 2. カテゴリーごとに既存キーワードと突合し、新規分を update
    for (const category of categories) {
      const currentKeywords = Array.isArray(category.keywords) 
        ? (category.keywords as string[]) 
        : [];

      // このカテゴリーに紐付く頻出名候補
      const candidates = stats
        .filter(s => s.categoryId === category.id)
        .map(s => s.name);

      // 未登録かつ2文字以上のキーワードを抽出
      const newEntries = candidates.filter(
        name => name && name.length >= 2 && !currentKeywords.includes(name)
      );

      if (newEntries.length > 0) {
        await prisma.category.update({
          where: { id: category.id },
          data: {
            keywords: [...currentKeywords, ...newEntries]
          }
        });
        totalAdded += newEntries.length;
        logger.info(`[OPTIMIZE] Category:${category.name} added ${newEntries.length} keywords.`);
      }
    }

    res.json({
      success: true,
      data: {
        addedCount: totalAdded,
        message: `${totalAdded} 件のキーワードを最適化しました。`
      }
    });
  } catch (error) {
    next(error);
  }
};