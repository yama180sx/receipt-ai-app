import { prisma } from '../utils/prismaClient';
import type { PrismaTx } from '../utils/prismaTransaction';

export async function findCategoriesByFamilyGroup(familyGroupId: number) {
  return prisma.category.findMany({
    where: { familyGroupId },
    orderBy: { id: 'asc' },
  });
}

export async function findCategoryIdByKeywordInTx(
  tx: PrismaTx,
  familyGroupId: number,
  itemName: string
) {
  return tx.$queryRaw<{ id: number }[]>`
    SELECT c.id FROM "Category" c, jsonb_array_elements_text(c.keywords) AS kw
    WHERE c."familyGroupId" = ${familyGroupId}
      AND ${itemName} LIKE '%' || kw || '%'
    LIMIT 1;
  `;
}

export async function findFallbackCategoryIdInTx(tx: PrismaTx, familyGroupId: number) {
  return tx.category.findFirst({
    where: { familyGroupId, name: 'その他' },
    select: { id: true },
  });
}
