import { PrismaClient, Prisma } from '@prisma/client';
import { analyzeReceiptImage, ParsedReceipt } from './geminiService';
import logger from '../utils/logger';
import { normalizeStoreName, inferCategoryId, getCleanText } from '../utils/normalizer';

const prisma = new PrismaClient();

/**
 * 🔍 重複チェックのデバッグモード
 * 調査時は true にしてください
 */
const DEBUG_DUPLICATE_AI = false;

/**
 * AI解析済みのデータをDBに永続化する
 */
export const saveParsedReceipt = async (
  memberId: number, 
  parsedData: ParsedReceipt, 
  imagePath: string 
) => {
  try {
    // 1. 店舗名の正規化
    const officialStoreName = await normalizeStoreName(parsedData.storeName || '');

    // JST時刻のパース処理
    let jstDate: Date;
    if (parsedData.purchaseDate) {
      const dateStr = parsedData.purchaseDate.includes('+') 
        ? parsedData.purchaseDate 
        : `${parsedData.purchaseDate}+09:00`;
      jstDate = new Date(dateStr);
    } else {
      jstDate = new Date();
    }

    // --- 【Issue #22 重複チェックの追加】 ---
    const totalAmount = parsedData.totalAmount || 0;
    
    if (DEBUG_DUPLICATE_AI) {
      logger.debug(`[DUPE_AI:CHECK] 開始: Member:${memberId}, Store:"${officialStoreName}", Amount:${totalAmount}, Date:${jstDate.toISOString()}`);
    }

    // 日付の範囲設定
    const startOfDay = new Date(jstDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(jstDate);
    endOfDay.setHours(23, 59, 59, 999);

    // 金額と日付で先行照会
    const existingReceipts = await prisma.receipt.findMany({
      where: {
        memberId: memberId,
        totalAmount: totalAmount,
        date: { gte: startOfDay, lte: endOfDay }
      }
    });

    if (DEBUG_DUPLICATE_AI) {
      logger.debug(`[DUPE_AI:DB_HITS] 候補数: ${existingReceipts.length}`);
    }

    // 店舗名の揺れを考慮した比較
    const normalizedNew = getCleanText(officialStoreName);
    for (const rec of existingReceipts) {
      const normalizedOld = getCleanText(rec.storeName);
      
      if (DEBUG_DUPLICATE_AI) {
        logger.debug(`[DUPE_AI:COMPARE] New:"${normalizedNew}" vs Existing:"${normalizedOld}"`);
      }

      if (normalizedNew === normalizedOld) {
        logger.warn(`[DUPE_AI:BLOCK] 重複を検知しました (ID: ${rec.id})`);
        // 重複エラーを投げる
        const error = new Error('DUPLICATE_RECEIPT_DETECTED');
        (error as any).statusCode = 409;
        throw error;
      }
    }
    // --- 【重複チェック終了】 ---

    return await prisma.$transaction(async (tx) => {
      const itemsToCreate = await Promise.all(parsedData.items.map(async (item) => {
        const cleanItemName = getCleanText(item.name);
        const cleanStoreName = getCleanText(officialStoreName);

        const masteredItem = await tx.productMaster.findUnique({
          where: {
            name_storeName: {
              name: cleanItemName,
              storeName: cleanStoreName
            }
          }
        });

        let finalCategoryId: number | null;
        if (masteredItem) {
          finalCategoryId = masteredItem.categoryId;
          logger.info(`[学習適用] 商品: "${item.name}" -> CategoryID: ${finalCategoryId}`);
        } else {
          finalCategoryId = await inferCategoryId(item.name, item.inferredCategory);
        }

        return {
          name: item.name,
          price: item.price,
          quantity: item.quantity || 1,
          categoryId: finalCategoryId
        };
      }));

      const receipt = await tx.receipt.create({
        data: {
          memberId: memberId,
          storeName: officialStoreName,
          date: jstDate,
          totalAmount: totalAmount,
          rawText: JSON.stringify(parsedData),
          imagePath: imagePath,
          items: {
            create: itemsToCreate
          },
        },
        include: {
          items: { include: { category: true } },
        },
      });
      return receipt;
    });
  } catch (error) {
    // 重複エラーはそのまま上に投げる
    if ((error as any).message === 'DUPLICATE_RECEIPT_DETECTED') throw error;

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // (既存のエラーハンドリング...)
      logger.error(`[DBエラー] Prismaエラーコード: ${error.code}`);
    }
    throw error;
  }
};

/**
 * 画像解析からDB保存までを統合する
 */
export const processAndSaveReceipt = async (memberId: number, imagePath: string) => {
  let step = 'INITIALIZING';
  let parsedData: ParsedReceipt | null = null;
  const startTime = Date.now();

  try {
    step = 'GEMINI_ANALYSIS';
    logger.info(`[${step}] 解析開始 path: ${imagePath}`);
    parsedData = await analyzeReceiptImage(imagePath);
    logger.info(`[${step}] ✅ 解析成功`);

    step = 'DB_PERSISTENCE';
    logger.info(`[${step}] 保存開始 memberId: ${memberId}`);
    
    const result = await saveParsedReceipt(memberId, parsedData, imagePath);
    
    const duration = Date.now() - startTime;
    logger.info(`[${step}] ✅ DB保存完了 ID: ${result.id}`, { durationMs: duration });

    return result;

  } catch (error: any) {
    // 重複エラーの場合は専用のログを出す
    if (error.message === 'DUPLICATE_RECEIPT_DETECTED') {
      logger.warn(`[PROCESS] 重複のため保存をスキップしました (Member: ${memberId})`);
      throw error;
    }

    logger.error(`[ERROR] ${step} フェーズで失敗しました。`, { 
      step, errorMessage: error.message 
    });
    throw error;
  }
};