import { AppError } from '../../utils/appError';
import logger from '../../utils/logger';
import { pickNextCategoryColor } from '../../utils/categoryColor';
import type { TenantContext } from '../../utils/context';
import {
  createCategoryRecord,
  deleteCategoryById,
  findCategoriesByFamilyGroup,
  findCategoryByIdAndFamilyGroup,
  findCategoryColorsByFamilyGroup,
} from '../../repositories/categoryRepository';

export async function listCategories(ctx: TenantContext) {
  return findCategoriesByFamilyGroup(ctx.familyGroupId);
}

export async function createCategory(
  ctx: TenantContext,
  input: { name: string; color?: string | null }
) {
  const { name, color } = input;
  if (!name) {
    throw new AppError('Name is required', 400);
  }

  const existing = await findCategoryColorsByFamilyGroup(ctx.familyGroupId);
  const existingColors = existing.map((c) => c.color);
  const requested = typeof color === 'string' && color.trim() ? color.trim() : '';
  const isDuplicate =
    requested &&
    existingColors.some(
      (c) => (c ?? '').trim().toLowerCase() === requested.toLowerCase()
    );
  const resolvedColor =
    requested && !isDuplicate ? requested : pickNextCategoryColor(existingColors);

  const category = await createCategoryRecord({
    name,
    color: resolvedColor,
    familyGroupId: ctx.familyGroupId,
  });

  logger.info(`[CATEGORY] Created: ${name}`);
  return category;
}

export async function deleteCategory(ctx: TenantContext, categoryId: number) {
  const existing = await findCategoryByIdAndFamilyGroup(categoryId, ctx.familyGroupId);
  if (!existing) {
    throw new AppError('Category not found', 404);
  }

  try {
    await deleteCategoryById(existing.id);
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
