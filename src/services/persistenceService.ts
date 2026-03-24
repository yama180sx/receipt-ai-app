import logger from '../utils/logger';
import { getCleanText, inferCategoryId, normalizeStoreName } from '../utils/normalizer';
import { prisma } from '../utils/prismaClient';

export interface ReceiptInput {
  memberId: number;
  storeName: string;
  date: Date;
  totalAmount: number;
  items: Array<{
    name: string;
    price: number;
    quantity?: number;
    inferredCategory?: string; // AIが推論したカテゴリ名
    categoryId?: number | null; // 手動入力時に指定があれば優先
  }>;
  imagePath?: string;
  rawText?: string | object | null;
}

/**
 * すべてのルート（AI/手動）からの保存を司る共通サービス
 * Issue #20: ユーザーの学習結果（ProductMaster）をAI推論より優先適用
 */
export const saveReceiptData = async (input: ReceiptInput) => {
  const { memberId, storeName, date, totalAmount } = input;

  // 1. 店舗名の正規化（シノニムマスタの適用）
  const officialStoreName = await normalizeStoreName(storeName);
  const normalizedStore = getCleanText(officialStoreName);

  // 2. 重複チェック
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const potentialDuplicates = await prisma.receipt.findMany({
    where: {
      memberId,
      totalAmount,
      date: { gte: startOfDay, lte: endOfDay },
    },
  });

  for (const rec of potentialDuplicates) {
    if (getCleanText(rec.storeName) === normalizedStore) {
      logger.debug(`[PERSISTENCE] 重複検知: ID ${rec.id} (${officialStoreName})`);
      const error = new Error('DUPLICATE_RECEIPT_DETECTED');
      (error as any).statusCode = 409;
      throw error;
    }
  }

  // rawText の型調整（String必須への対応）
  let processedRawText: string = ""; 
  if (typeof input.rawText === 'object' && input.rawText !== null) {
    processedRawText = JSON.stringify(input.rawText);
  } else if (typeof input.rawText === 'string') {
    processedRawText = input.rawText;
  }

  // 3. トランザクションによる永続化
  return await prisma.$transaction(async (tx) => {
    
    // 各アイテムのカテゴリ確定ロジック
    const itemsWithCategory = await Promise.all(input.items.map(async (item) => {
      let finalCategoryId = item.categoryId;

      // 手動指定がない場合、学習マスタ -> AI推論の順で判定
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
          logger.debug(`[LEARNING] マスタ適用成功: "${item.name}" @ ${officialStoreName} -> Category:${finalCategoryId}`);
        } else {
          // B. マスタになければ AI（Gemini）の推論結果を正規化して適用
          finalCategoryId = await inferCategoryId(item.name, item.inferredCategory);
          logger.debug(`[INFERENCE] AI推論適用: "${item.name}" -> Category:${finalCategoryId}`);
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
        storeName: officialStoreName, // 正規化された正式名称で保存
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
  });
};