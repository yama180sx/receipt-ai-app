import type { PrismaTx } from '../utils/prismaTransaction';
import { prisma } from '../utils/prismaClient';
import {
  findCategoryIdByKeywordInTx,
  findFallbackCategoryIdInTx,
} from '../repositories/categoryRepository';

/**
 * [Issue #39 / #93-4] カテゴリー推定（世帯スコープ）
 */
export const estimateCategoryId = async (
  itemName: string,
  _storeName: string,
  familyGroupId: number,
  tx: PrismaTx = prisma
): Promise<number> => {
  try {
    const categoryByKeyword = await findCategoryIdByKeywordInTx(tx, familyGroupId, itemName);
    if (categoryByKeyword.length > 0) {
      return categoryByKeyword[0].id;
    }

    const fallback = await findFallbackCategoryIdInTx(tx, familyGroupId);
    return fallback?.id ?? 0;
  } catch (error) {
    console.error('[CategoryService] Estimation Error:', error);
    return 0;
  }
};
