import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger';
import { getCleanText, inferCategoryId } from '../utils/normalizer';

const prisma = new PrismaClient();

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
 * すべてのルート（AI/手動）からの保存を司る共通サービス
 */
export const saveReceiptData = async (input: ReceiptInput) => {
  const { memberId, storeName, date, totalAmount } = input;

  // 1. 重複チェック
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

  const normalizedNew = getCleanText(storeName);
  for (const rec of potentialDuplicates) {
    if (getCleanText(rec.storeName) === normalizedNew) {
      logger.debug(`[PERSISTENCE] 重複検知: ID ${rec.id}`);
      const error = new Error('DUPLICATE_RECEIPT_DETECTED');
      (error as any).statusCode = 409;
      throw error;
    }
  }

  // ★ rawText の型を String（必須）に合わせる（空文字をデフォルトに）
  let processedRawText: string = ""; 
  if (typeof input.rawText === 'object' && input.rawText !== null) {
    processedRawText = JSON.stringify(input.rawText);
  } else if (typeof input.rawText === 'string') {
    processedRawText = input.rawText;
  }

  // 2. トランザクションによる永続化
  return await prisma.$transaction(async (tx) => {
    const itemsWithCategory = await Promise.all(input.items.map(async (item) => {
      let finalCategoryId = item.categoryId;

      if (!finalCategoryId) {
        const mastered = await tx.productMaster.findUnique({
          where: { 
            name_storeName: { 
              name: getCleanText(item.name), 
              storeName: normalizedNew 
            } 
          }
        });
        
        if (mastered) {
          finalCategoryId = mastered.categoryId;
          logger.debug(`[LEARNING] マスタ適用: ${item.name} -> ${finalCategoryId}`);
        } else {
          finalCategoryId = await inferCategoryId(item.name, item.inferredCategory);
        }
      }

      return {
        name: item.name,
        price: item.price,
        quantity: item.quantity || 1,
        categoryId: finalCategoryId ?? undefined,
      };
    }));

    return await tx.receipt.create({
      data: {
        memberId: memberId,
        storeName: storeName,
        date: date,
        totalAmount: totalAmount,
        imagePath: input.imagePath || "", // String型に合わせて空文字
        rawText: processedRawText,        // ここで string 型が確定しているため波線は消えます
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