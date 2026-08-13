import type { PrismaClient } from '@prisma/client';
import { loadInitialData } from './initialData';

type StandardMasterClient = Pick<PrismaClient, 'standardCategory' | 'productType' | 'standardProductClassificationRule'>;

/** JSONで固定した共通マスタを非破壊で同期する。JSON外の既存レコードは削除しない。 */
export async function syncStandardProductClassificationMasters(prisma: StandardMasterClient) {
  const { standard } = loadInitialData();
  const categoryIdByCode = new Map<string, number>();
  for (const category of standard.standardCategories) {
    const parentId = category.parentCode ? categoryIdByCode.get(category.parentCode) : null;
    if (category.parentCode && !parentId) throw new Error(`StandardCategory parent is missing: ${category.parentCode}`);
    const record = await prisma.standardCategory.upsert({ where: { code: category.code }, create: { code: category.code, name: category.name, parentId, displayOrder: category.displayOrder, isActive: true }, update: { name: category.name, parentId, displayOrder: category.displayOrder, isActive: true } });
    categoryIdByCode.set(category.code, record.id);
  }
  const productTypeIdByCode = new Map<string, number>();
  for (const productType of standard.productTypes) {
    const standardCategoryId = categoryIdByCode.get(productType.standardCategoryCode);
    if (!standardCategoryId) throw new Error(`ProductType category is missing: ${productType.standardCategoryCode}`);
    const record = await prisma.productType.upsert({ where: { code: productType.code }, create: { code: productType.code, name: productType.name, standardCategoryId, displayOrder: productType.displayOrder, isActive: true }, update: { name: productType.name, standardCategoryId, displayOrder: productType.displayOrder, isActive: true } });
    productTypeIdByCode.set(productType.code, record.id);
  }
  for (const rule of standard.standardProductClassificationRules) {
    const standardCategoryId = categoryIdByCode.get(rule.standardCategoryCode);
    const productTypeId = productTypeIdByCode.get(rule.productTypeCode);
    if (!standardCategoryId || !productTypeId) throw new Error(`StandardProductClassificationRule reference is missing: ${rule.normalizedKeyword}`);
    const data = { standardCategoryId, productTypeId, priority: rule.priority, isActive: true, lastChangeReason: rule.reason };
    await prisma.standardProductClassificationRule.upsert({ where: { normalizedKeyword_productTypeId: { normalizedKeyword: rule.normalizedKeyword, productTypeId } }, create: { normalizedKeyword: rule.normalizedKeyword, ...data }, update: data });
  }
}
