import { prisma } from '../../utils/prismaClient';
import { AppError } from '../../utils/appError';
import logger from '../../utils/logger';
import { pickNextCategoryColor } from '../../utils/categoryColor';
import type { TenantContext } from '../../utils/context';

export async function listCategories(ctx: TenantContext) {
  return prisma.category.findMany({
    where: { familyGroupId: ctx.familyGroupId },
    orderBy: { id: 'asc' },
  });
}

export async function createCategory(
  ctx: TenantContext,
  input: { name: string; color?: string | null }
) {
  const { name, color } = input;
  if (!name) {
    throw new AppError('Name is required', 400);
  }

  const existing = await prisma.category.findMany({
    where: { familyGroupId: ctx.familyGroupId },
    select: { color: true },
  });
  const existingColors = existing.map((c) => c.color);
  const requested = typeof color === 'string' && color.trim() ? color.trim() : '';
  const isDuplicate =
    requested &&
    existingColors.some(
      (c) => (c ?? '').trim().toLowerCase() === requested.toLowerCase()
    );
  const resolvedColor =
    requested && !isDuplicate ? requested : pickNextCategoryColor(existingColors);

  const category = await prisma.category.create({
    data: {
      name,
      color: resolvedColor,
      familyGroupId: ctx.familyGroupId,
    },
  });

  logger.info(`[CATEGORY] Created: ${name}`);
  return category;
}

export async function deleteCategory(ctx: TenantContext, categoryId: number) {
  const existing = await prisma.category.findFirst({
    where: { id: categoryId, familyGroupId: ctx.familyGroupId },
  });
  if (!existing) {
    throw new AppError('Category not found', 404);
  }

  try {
    await prisma.category.delete({ where: { id: existing.id } });
    logger.info(`[CATEGORY] Deleted: ID ${categoryId}`);
  } catch (error: unknown) {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code: string }).code === 'P2003'
    ) {
      throw new AppError('このカテゴリーは既に使用されているため削除できません。', 400);
    }
    throw error;
  }
}

/** ProductMaster 統計から Category キーワードを補強（当該世帯の Category のみ更新） */
export async function optimizeCategoryKeywords(ctx: TenantContext) {
  const stats = await prisma.productMaster.groupBy({
    by: ['name', 'categoryId'],
    where: { familyGroupId: ctx.familyGroupId },
    _count: { name: true },
    having: { name: { _count: { gte: 5 } } },
  });

  const categories = await prisma.category.findMany({
    where: { familyGroupId: ctx.familyGroupId },
  });
  let totalAdded = 0;

  for (const category of categories) {
    const currentKeywords = Array.isArray(category.keywords)
      ? (category.keywords as string[])
      : [];

    const candidates = stats
      .filter((s) => s.categoryId === category.id)
      .map((s) => s.name);

    const newEntries = candidates.filter(
      (name) => name && name.length >= 2 && !currentKeywords.includes(name)
    );

    if (newEntries.length > 0) {
      await prisma.category.update({
        where: { id: category.id },
        data: { keywords: [...currentKeywords, ...newEntries] },
      });
      totalAdded += newEntries.length;
      logger.info(`[OPTIMIZE] Category:${category.name} added ${newEntries.length} keywords.`);
    }
  }

  return {
    addedCount: totalAdded,
    message: `${totalAdded} 件のキーワードを最適化しました。`,
  };
}
