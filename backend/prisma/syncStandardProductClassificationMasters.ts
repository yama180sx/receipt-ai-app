import type { PrismaClient } from '@prisma/client';
import {
  INITIAL_PRODUCT_TYPES,
  INITIAL_STANDARD_PRODUCT_CLASSIFICATION_RULES,
  STANDARD_CATEGORIES,
} from './standardProductClassificationSeed';

type StandardMasterClient = Pick<
  PrismaClient,
  'standardCategory' | 'productType' | 'standardProductClassificationRule'
>;

/**
 * 共通の商品分類マスタを定義どおりに追加・更新する。
 * 世帯データやレシートを削除・再分類せず、何度実行しても同じ状態に収束する。
 */
export async function syncStandardProductClassificationMasters(prisma: StandardMasterClient) {
  const categoryIdByCode = new Map<string, number>();

  for (const category of STANDARD_CATEGORIES) {
    const parentId = category.parentCode
      ? categoryIdByCode.get(category.parentCode)
      : null;

    if (category.parentCode && !parentId) {
      throw new Error(`StandardCategory parent is missing: ${category.parentCode}`);
    }

    const data = {
      name: category.name,
      parentId,
      displayOrder: category.displayOrder,
      isActive: true,
    };
    const record = await prisma.standardCategory.upsert({
      where: { code: category.code },
      create: { code: category.code, ...data },
      update: data,
    });
    categoryIdByCode.set(category.code, record.id);
  }

  const productTypeIdByCode = new Map<string, number>();
  for (const productType of INITIAL_PRODUCT_TYPES) {
    const standardCategoryId = categoryIdByCode.get(productType.standardCategoryCode);
    if (!standardCategoryId) {
      throw new Error(`ProductType category is missing: ${productType.standardCategoryCode}`);
    }

    const data = {
      name: productType.name,
      standardCategoryId,
      displayOrder: productType.displayOrder,
      isActive: true,
    };
    const record = await prisma.productType.upsert({
      where: { code: productType.code },
      create: { code: productType.code, ...data },
      update: data,
    });
    productTypeIdByCode.set(productType.code, record.id);
  }

  for (const entry of INITIAL_STANDARD_PRODUCT_CLASSIFICATION_RULES) {
    const standardCategoryId = categoryIdByCode.get(entry.standardCategoryCode);
    const productTypeId = productTypeIdByCode.get(entry.productTypeCode);
    if (!standardCategoryId || !productTypeId) {
      throw new Error(`StandardProductClassificationRule reference is missing: ${entry.normalizedKeyword}`);
    }

    const data = { standardCategoryId, productTypeId, priority: entry.priority, isActive: true, lastChangeReason: entry.reason };
    await prisma.standardProductClassificationRule.upsert({
      where: { normalizedKeyword_productTypeId: { normalizedKeyword: entry.normalizedKeyword, productTypeId } },
      create: { normalizedKeyword: entry.normalizedKeyword, ...data },
      // 管理画面での優先度・有効状態・理由を、マスタ同期で上書きしない。
      update: {},
    });
  }
}
