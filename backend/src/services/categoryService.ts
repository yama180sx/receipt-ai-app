import { Prisma } from '@prisma/client';
// 1. シングルトンを 'db' という名前でインポートして、変数名の衝突を避ける
import { prisma as db } from '../utils/prismaClient';

/**
 * [Issue #39] カテゴリー推定ロジック
 * @param tx - トランザクションクライアント。デフォルトはシングルトンの db。
 */
export const estimateCategoryId = async (
  itemName: string, 
  storeName: string,
  // 2. PrismaClient と TransactionClient は厳密には別型なので 'as any' で波線を消す
  // これにより、通常の呼び出し（db使用）とトランザクション内（tx使用）の両方に対応
  tx: Prisma.TransactionClient = db as any
): Promise<number> => {
  try {
    // Phase 1: 学習データ (店舗込み優先)
    const matchWithStore = await tx.productMaster.findFirst({
      where: { name: itemName, storeName: storeName },
      select: { categoryId: true }
    });
    if (matchWithStore) return matchWithStore.categoryId;

    // Phase 2: 学習データ (品名のみ)
    const matchAnyStore = await tx.productMaster.findFirst({
      where: { name: itemName },
      select: { categoryId: true }
    });
    if (matchAnyStore) return matchAnyStore.categoryId;

    // Phase 3: Category.keywords (JSONB 部分一致検索)
    const categoryByKeyword = await tx.$queryRaw<any[]>`
      SELECT id FROM "Category", jsonb_array_elements_text(keywords) AS kw
      WHERE ${itemName} LIKE '%' || kw || '%'
      LIMIT 1;
    `;

    if (categoryByKeyword && categoryByKeyword.length > 0) {
      return categoryByKeyword[0].id;
    }

    return 99; // その他
  } catch (error) {
    console.error('[CategoryService] Estimation Error:', error);
    return 99;
  }
};