import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger';

const prisma = new PrismaClient();

// 一覧取得
export const getCategories = async (req: any, res: any) => {
  try {
    const categories = await prisma.category.findMany({ orderBy: { id: 'asc' } });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch' });
  }
};

// 新規追加
export const createCategory = async (req: any, res: any) => {
  try {
    const { name, color } = req.body;
    // バリデーション
    if (!name) return res.status(400).json({ error: 'Name is required' });

    const category = await prisma.category.create({
      data: { name, color: color || '#2ecc71' }
    });
    logger.info(`[CATEGORY] Created: ${name}`);
    res.status(201).json(category);
  } catch (error) {
    logger.error('[CATEGORY] Create Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// 削除
export const deleteCategory = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    await prisma.category.delete({ where: { id: Number(id) } });
    res.status(204).send();
  } catch (error) {
    // 30年選手の知恵：外部キー制約（レシートで使用中）の場合は 400 を返す
    res.status(400).json({ error: 'Category in use' });
  }
};