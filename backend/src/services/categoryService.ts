import { Prisma } from '@prisma/client';
import { prisma as db } from '../utils/prismaClient';

/**
 * [Issue #39 / #93-4] カテゴリー推定（世帯スコープ）
 */
export const estimateCategoryId = async (
  itemName: string,
  storeName: string,
  familyGroupId: number,
  tx: Prisma.TransactionClient = db as any
): Promise<number> => {
  try {
    const matchWithStore = await tx.productMaster.findFirst({
      where: { name: itemName, storeName, familyGroupId },
      select: { categoryId: true },
    });
    if (matchWithStore) return matchWithStore.categoryId;

    const matchAnyStore = await tx.productMaster.findFirst({
      where: { name: itemName, familyGroupId },
      select: { categoryId: true },
    });
    if (matchAnyStore) return matchAnyStore.categoryId;

    const categoryByKeyword = await tx.$queryRaw<{ id: number }[]>`
      SELECT c.id FROM "Category" c, jsonb_array_elements_text(c.keywords) AS kw
      WHERE c."familyGroupId" = ${familyGroupId}
        AND ${itemName} LIKE '%' || kw || '%'
      LIMIT 1;
    `;

    if (categoryByKeyword.length > 0) {
      return categoryByKeyword[0].id;
    }

    const fallback = await tx.category.findFirst({
      where: { familyGroupId, name: 'その他' },
      select: { id: true },
    });
    return fallback?.id ?? 0;
  } catch (error) {
    console.error('[CategoryService] Estimation Error:', error);
    return 0;
  }
};
