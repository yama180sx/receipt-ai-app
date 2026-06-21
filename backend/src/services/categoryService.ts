import type { PrismaTx } from '../utils/prismaTransaction';
import { prisma } from '../utils/prismaClient';
import {
  findCategoryIdByKeywordInTx,
  findFallbackCategoryIdInTx,
} from '../repositories/categoryRepository';
import {
  findProductMasterByNameInTx,
  findProductMasterForEstimateInTx,
} from '../repositories/productMasterRepository';

/**
 * [Issue #39 / #93-4] カテゴリー推定（世帯スコープ）
 */
export const estimateCategoryId = async (
  itemName: string,
  storeName: string,
  familyGroupId: number,
  tx: PrismaTx = prisma
): Promise<number> => {
  try {
    const matchWithStore = await findProductMasterForEstimateInTx(tx, {
      name: itemName,
      storeName,
      familyGroupId,
    });
    if (matchWithStore) return matchWithStore.categoryId;

    const matchAnyStore = await findProductMasterByNameInTx(tx, {
      name: itemName,
      familyGroupId,
    });
    if (matchAnyStore) return matchAnyStore.categoryId;

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
