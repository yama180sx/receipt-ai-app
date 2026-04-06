import { PrismaClient, Prisma } from '@prisma/client';
import { analyzeReceiptImage, ParsedReceipt } from './geminiService';
import { estimateCategoryId } from './categoryService';
import logger from '../utils/logger';
import { normalizeStoreName, getCleanText } from '../utils/normalizer';

const prisma = new PrismaClient();

/**
 * 🛠️ 安全な日付パース関数
 */
const parseSafeDate = (dateStr: string | null | undefined): Date => {
  if (!dateStr) return new Date();
  const formattedStr = dateStr.includes('+') ? dateStr : `${dateStr}+09:00`;
  const date = new Date(formattedStr);
  if (isNaN(date.getTime())) {
    logger.warn(`[WARN] 無効な日付形式: "${dateStr}"。現在時刻を代用します。`);
    return new Date();
  }
  return date;
};

/**
 * AI解析済みのデータをDBに永続化する
 * [Issue #42 改訂版] ハッシュ値を廃止し、ビジネスルール（同日・同金額）で重複を判定
 */
export const saveParsedReceipt = async (
  memberId: number, 
  parsedData: ParsedReceipt, 
  imagePath: string 
) => {
  try {
    const officialStoreName = await normalizeStoreName(parsedData.storeName || '');
    const jstDate = parseSafeDate(parsedData.purchaseDate);
    const totalAmount = parsedData.totalAmount || 0;

    // --- 重複チェックロジック ---
    // 「同じメンバー」が「同じ日」に「同じ合計金額」のレシートを登録しようとしたらブロック
    const startOfDay = new Date(jstDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(jstDate);
    endOfDay.setHours(23, 59, 59, 999);

    const existing = await prisma.receipt.findFirst({
      where: {
        memberId: memberId,
        totalAmount: totalAmount,
        date: {
          gte: startOfDay,
          lte: endOfDay
        }
      },
      select: { id: true }
    });

    if (existing) {
      logger.warn(`[DUPE_CHECK:BLOCK] 同一日・同一金額の重複を検知 (ExistingID: ${existing.id})`);
      const error = new Error('DUPLICATE_RECEIPT_DETECTED');
      (error as any).statusCode = 409;
      throw error;
    }

    // --- DB登録処理 (Transaction) ---
    return await prisma.$transaction(async (tx) => {
      const itemsToCreate = await Promise.all(parsedData.items.map(async (item) => {
        const cleanItemName = getCleanText(item.name);
        const cleanStoreName = getCleanText(officialStoreName);

        // [Issue #39] カテゴリーを推定
        const finalCategoryId = await estimateCategoryId(cleanItemName, cleanStoreName, tx);

        return {
          name: item.name,
          price: item.price,
          quantity: item.quantity || 1,
          categoryId: finalCategoryId
        };
      }));

      return await tx.receipt.create({
        data: {
          memberId: memberId,
          storeName: officialStoreName,
          date: jstDate,
          totalAmount: totalAmount,
          rawText: JSON.stringify(parsedData),
          imagePath: imagePath,
          // contentHash カラムへの代入を削除
          items: {
            create: itemsToCreate
          },
        },
        include: {
          items: { include: { category: true } },
        },
      });
    }, { timeout: 10000 });
  } catch (error: any) {
    if (error.message === 'DUPLICATE_RECEIPT_DETECTED') throw error;
    logger.error(`[DBエラー] ${error}`);
    throw error;
  }
};

/**
 * 画像解析からDB保存までを統合
 */
export const processAndSaveReceipt = async (memberId: number, imagePath: string) => {
  let step = 'INITIALIZING';
  const startTime = Date.now();

  try {
    step = 'GEMINI_ANALYSIS';
    const parsedData = await analyzeReceiptImage(imagePath);

    step = 'DB_PERSISTENCE';
    const result = await saveParsedReceipt(memberId, parsedData, imagePath);
    
    logger.info(`[${step}] ✅ 完了 ID: ${result.id}`, { durationMs: Date.now() - startTime });
    return result;

  } catch (error: any) {
    if (error.message === 'DUPLICATE_RECEIPT_DETECTED') throw error;
    logger.error(`[ERROR] ${step} フェーズで失敗: ${error.message}`);
    throw error;
  }
};