import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * [Issue #39] カテゴリー推定ロジック
 * 1. ProductMaster (完全一致 + 店舗名)
 * 2. ProductMaster (完全一致)
 * 3. Category.keywords (JSONB 包含検索)
 * 4. フォールバック (ID: 99)
 */
export const estimateCategoryId = async (
  itemName: string, 
  storeName?: string,
  tx: Prisma.TransactionClient | PrismaClient = prisma
): Promise<number> => {
  try {
    // Phase 1: 学習データ (店舗込み優先)
    if (storeName) {
      const matchWithStore = await tx.productMaster.findFirst({
        where: { name: itemName, storeName: storeName },
        select: { categoryId: true }
      });
      if (matchWithStore) return matchWithStore.categoryId;
    }

    // Phase 2: 学習データ (品名のみ)
    const matchAnyStore = await tx.productMaster.findFirst({
      where: { name: itemName },
      select: { categoryId: true }
    });
    if (matchAnyStore) return matchAnyStore.categoryId;

    // 3. Category.keywords (部分一致検索)
    // JSONB配列の要素をバラして、itemName がキーワードを含んでいるか LIKE で検索
    const categoryByKeyword = await tx.$queryRaw<any[]>`
      SELECT id FROM "Category", jsonb_array_elements_text(keywords) AS kw
      WHERE ${itemName} LIKE '%' || kw || '%'
      LIMIT 1;
    `;

    if (categoryByKeyword && categoryByKeyword.length > 0) {
      return categoryByKeyword[0].id;
    }

    // Phase 4: フォールバック
    return 99;
  } catch (error) {
    console.error('[CategoryService] Estimation Error:', error);
    return 99;
  }
};