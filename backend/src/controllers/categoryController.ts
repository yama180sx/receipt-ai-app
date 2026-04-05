import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../utils/appError';
import logger from '../utils/logger';

const prisma = new PrismaClient();

/**
 * 📂 カテゴリー一覧取得
 */
export const getCategories = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const categories = await prisma.category.findMany({ 
      orderBy: { id: 'asc' } 
    });
    
    // Issue #40: レスポンス形式の統一
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

    // 削除成功時は data なしで success のみを返す（既存コードの 204 を踏襲する場合は res.status(204).send() でも可）
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