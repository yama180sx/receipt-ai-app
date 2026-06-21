import { prisma } from '../utils/prismaClient';
import type { PrismaTx } from '../utils/prismaTransaction';

export async function findCategoriesByFamilyGroup(familyGroupId: number) {
  return prisma.category.findMany({
    where: { familyGroupId },
    orderBy: { id: 'asc' },
  });
}

export async function findCategoryColorsByFamilyGroup(familyGroupId: number) {
  return prisma.category.findMany({
    where: { familyGroupId },
    select: { color: true },
  });
}

export async function createCategoryRecord(input: {
  name: string;
  color: string;
  familyGroupId: number;
}) {
  return prisma.category.create({ data: input });
}

export async function findCategoryByIdAndFamilyGroup(categoryId: number, familyGroupId: number) {
  return prisma.category.findFirst({
    where: { id: categoryId, familyGroupId },
  });
}

export async function deleteCategoryById(categoryId: number) {
  return prisma.category.delete({ where: { id: categoryId } });
}

export async function groupProductMasterStatsByCategory(familyGroupId: number) {
  return prisma.productMaster.groupBy({
    by: ['name', 'categoryId'],
    where: { familyGroupId },
    _count: { name: true },
    having: { name: { _count: { gte: 5 } } },
  });
}

export async function updateCategoryKeywords(categoryId: number, keywords: string[]) {
  return prisma.category.update({
    where: { id: categoryId },
    data: { keywords },
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
