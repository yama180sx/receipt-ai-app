import logger from '../utils/logger';
import { getCleanText, normalizeStoreName } from '../utils/normalizer';
import { prisma as db } from '../utils/prismaClient';
import { estimateCategoryId } from './categoryService';

/**
 * [Issue #45] 入力インターフェースに familyGroupId を追加
 */
export interface ReceiptInput {
  memberId: number;
  familyGroupId: number; // ★必須
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
 * 世帯コンテキストに基づき、データの混入を防止します。
 */
export const saveReceiptData = async (input: ReceiptInput) => {
  const { memberId, familyGroupId, storeName, date, totalAmount } = input;

  // 1. 店舗名の正規化
  const officialStoreName = await normalizeStoreName(storeName);
  const normalizedStore = getCleanText(officialStoreName);

  // 2. [Issue #45] 重複チェック（世帯・メンバー・同日・同金額・同店舗）
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const potentialDuplicates = await db.receipt.findMany({
    where: {
      familyGroupId, // ★世帯での絞り込み
      memberId,
      totalAmount,
      date: { gte: startOfDay, lte: endOfDay },
    },
  });

  for (const rec of potentialDuplicates) {
    if (getCleanText(rec.storeName) === normalizedStore) {
      logger.warn(`[DUPE_BLOCK] 世帯:${familyGroupId} で重複検知: ID ${rec.id}`);
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

        // A. [Issue #45] ProductMaster（世帯別の過去の正解）を検索
        const mastered = await tx.productMaster.findUnique({
          where: { 
            name_storeName_familyGroupId: { // スキーマで定義した複合ユニークキー名
              name: cleanItemName, 
              storeName: normalizedStore,
              familyGroupId: familyGroupId // ★世帯ごとに学習データを分離
            } 
          }
        });
        
        if (mastered) {
          finalCategoryId = mastered.categoryId;
          logger.debug(`[LEARNING] 世帯:${familyGroupId} マスタ適用: "${item.name}"`);
        } else {
          // B. カテゴリー推定（未学習の場合）
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

    // 4. レシート本体と明細の一括作成
    return await tx.receipt.create({
      data: {
        familyGroupId, // ★明示的に保存
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
  }, { timeout: 15000 }); // T320の負荷を考慮し、AI解析後のDB書き込みに余裕を持たせる
};