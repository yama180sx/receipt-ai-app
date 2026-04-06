import logger from '../utils/logger';
import { getCleanText, normalizeStoreName } from '../utils/normalizer';
// 1. 変数名の衝突を避けるため、シングルトンを db としてインポート
import { prisma as db } from '../utils/prismaClient';
import { estimateCategoryId } from './categoryService';

export interface ReceiptInput {
  memberId: number;
  storeName: string;
  date: Date;
  totalAmount: number;
  items: Array<{
    name: string;
    price: number;
    quantity?: number;
    inferredCategory?: string; 
    categoryId?: number | null; 
  }>;
  imagePath?: string;
  rawText?: string | object | null;
}

/**
 * 📂 すべてのルート（AI/手動）からの保存を司る共通サービス
 */
export const saveReceiptData = async (input: ReceiptInput) => {
  const { memberId, storeName, date, totalAmount } = input;

  // 1. 店舗名の正規化
  const officialStoreName = await normalizeStoreName(storeName);
  const normalizedStore = getCleanText(officialStoreName);

  // 2. 重複チェックロジック（同一メンバー・同日・同金額）
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  // シングルトンの db を使用
  const potentialDuplicates = await db.receipt.findMany({
    where: {
      memberId,
      totalAmount,
      date: { gte: startOfDay, lte: endOfDay },
    },
  });

  for (const rec of potentialDuplicates) {
    if (getCleanText(rec.storeName) === normalizedStore) {
      logger.warn(`[PERSISTENCE:DUPE_BLOCK] 重複検知: ID ${rec.id} (${officialStoreName})`);
      const error = new Error('DUPLICATE_RECEIPT_DETECTED');
      (error as any).statusCode = 409;
      throw error;
    }
  }

  // rawText の型調整
  let processedRawText: any = null; 
  if (typeof input.rawText === 'object' && input.rawText !== null) {
    processedRawText = input.rawText;
  } else if (typeof input.rawText === 'string') {
    try {
      processedRawText = JSON.parse(input.rawText);
    } catch {
      processedRawText = { raw: input.rawText };
    }
  }

  // 3. トランザクションによる永続化
  return await db.$transaction(async (tx) => {
    
    const itemsWithCategory = await Promise.all(input.items.map(async (item) => {
      let finalCategoryId = item.categoryId;

      if (!finalCategoryId) {
        const cleanItemName = getCleanText(item.name);

        // A. ProductMaster（過去の正解）を検索
        const mastered = await tx.productMaster.findUnique({
          where: { 
            name_storeName: { 
              name: cleanItemName, 
              storeName: normalizedStore 
            } 
          }
        });
        
        if (mastered) {
          finalCategoryId = mastered.categoryId;
          logger.debug(`[LEARNING] マスタ適用: "${item.name}" -> Cat:${finalCategoryId}`);
        } else {
          // B. カテゴリー推定（tx を渡して一貫性を保持）
          finalCategoryId = await estimateCategoryId(cleanItemName, normalizedStore, tx as any);
        }
      }

      return {
        name: item.name,
        price: item.price,
        quantity: item.quantity || 1,
        categoryId: finalCategoryId,
      };
    }));

    // レシート本体と明細の一括作成
    return await tx.receipt.create({
      data: {
        memberId,
        storeName: officialStoreName,
        date,
        totalAmount,
        imagePath: input.imagePath || "",
        rawText: processedRawText,
        items: {
          create: itemsWithCategory
        },
      },
      include: { 
        items: { 
          include: { category: true } 
        } 
      },
    });
  }, { timeout: 10000 });
};