import { PrismaClient, Prisma } from '@prisma/client';
import { analyzeReceiptImage, ParsedReceipt } from './geminiService';
import { estimateCategoryId } from './categoryService';
import { validateReceiptItems } from './validationService'; 
import logger from '../utils/logger';
import { normalizeStoreName, getCleanText } from '../utils/normalizer';

const prisma = new PrismaClient();

/**
 * 🛠️ 日付パース関数
 */
const parseSafeDate = (dateStr: string | null | undefined): Date => {
  if (!dateStr) return new Date();

  // 1. 文字列内のどこかに YYYY-MM-DD, YYYY/MM/DD, YYYY.MM.DD があれば抽出
  const match = dateStr.match(/(\d{4})[-\/\.](\d{2})[-\/\.](\d{2})/);
  
  if (match) {
    const y = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    const d = parseInt(match[3], 10);

    // ★ new Date(y, m-1, d) はシステム時刻（T320のJST）で 00:00:00 を作成します
    const date = new Date(y, m - 1, d, 0, 0, 0, 0);
    
    if (!isNaN(date.getTime())) {
      logger.info(`[DATE_DEBUG_SUCCESS] パース成功: ${date.toLocaleDateString('ja-JP')}`);
      return date;
    }
  }

  logger.error(`[DATE_DEBUG_FAIL] パース失敗: "${dateStr}"。現在時刻を使用します。`);
  return new Date();
};

/**
 * 解析済みデータの永続化
 * Workerでのシリアライズを確実にするため、保存後に再取得してPOJOとして返します。
 */
export const saveParsedReceipt = async (
  memberId: number, 
  familyGroupId: number,
  parsedData: ParsedReceipt, 
  imagePath: string,
  isSuspicious: boolean, 
  warnings: string[] 
) => {
  try {
    const officialStoreName = await normalizeStoreName(parsedData.storeName || '');
    // ★ ここでレシート上の日付（jstDate）を確定
    const jstDate = parseSafeDate(parsedData.purchaseDate);
    const totalAmount = parsedData.totalAmount || 0;

    // 重複チェック用の期間設定 (JST 00:00:00 〜 23:59:59)
    const startOfDay = new Date(jstDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(jstDate);
    endOfDay.setHours(23, 59, 59, 999);

    const existing = await prisma.receipt.findFirst({
      where: {
        familyGroupId: familyGroupId,
        totalAmount: totalAmount,
        date: { gte: startOfDay, lte: endOfDay }
      },
      select: { id: true }
    });

    if (existing) {
      logger.warn(`[DUPE_CHECK] 重複検知: ${jstDate.toISOString().split('T')[0]} / ¥${totalAmount}`);
      const error = new Error('DUPLICATE_RECEIPT_DETECTED');
      (error as any).statusCode = 409;
      throw error;
    }

    // 1. 保存処理（IDのみ取得）
    const savedReceiptId = await prisma.$transaction(async (tx) => {
      const itemsToCreate = await Promise.all(parsedData.items.map(async (item) => {
        const cleanItemName = getCleanText(item.name);
        const cleanStoreName = getCleanText(officialStoreName);
        const finalCategoryId = await estimateCategoryId(cleanItemName, cleanStoreName, tx);

        return {
          name: item.name,
          price: item.price,
          quantity: item.quantity || 1,
          categoryId: finalCategoryId
        };
      }));

      const created = await tx.receipt.create({
        data: {
          memberId,
          familyGroupId,
          storeName: officialStoreName,
          date: jstDate, // ★ パース済みの日付を保存
          totalAmount,
          rawText: JSON.stringify({ ...parsedData, validation: { isSuspicious, warnings } }),
          imagePath,
          items: { create: itemsToCreate },
        },
        select: { id: true }
      });
      return created.id;
    });

    // 2. ★【重要】保存後に明細（items）を含めて再取得し、POJOとして返却
    // これにより、Prismaオブジェクトの内部状態がWorkerの通信を邪魔するのを防ぎます。
    const finalReceipt = await prisma.receipt.findUnique({
      where: { id: savedReceiptId },
      include: {
        items: { include: { category: true } }
      }
    });

    if (!finalReceipt) throw new Error('FETCH_AFTER_SAVE_FAILED');

    // 通信経路でのデータ欠落を防ぐため、純粋なJSONオブジェクトとしてシリアライズ
    return {
      ...JSON.parse(JSON.stringify(finalReceipt)),
      isSuspicious,
      warnings
    };

  } catch (error: any) {
    if (error.message === 'DUPLICATE_RECEIPT_DETECTED') throw error;
    logger.error(`[DB_ERROR] ${error}`);
    throw error;
  }
};

/**
 * 画像解析からDB保存までを統合
 */
export const processAndSaveReceipt = async (memberId: number, imagePath: string) => {
  let step = 'INITIALIZING';
  try {
    const member = await prisma.familyMember.findUnique({
      where: { id: memberId },
      select: { familyGroupId: true }
    });
    if (!member) throw new Error('MEMBER_NOT_FOUND');

    step = 'GEMINI_ANALYSIS';
    const parsedData = await analyzeReceiptImage(imagePath);

    step = 'ANOMALY_DETECTION';
    const validation = validateReceiptItems(parsedData.items);
    
    step = 'DB_PERSISTENCE';
    const result = await saveParsedReceipt(
      memberId, 
      member.familyGroupId,
      parsedData, 
      imagePath, 
      validation.isSuspicious, 
      validation.warnings
    );
    
    // T320のログで成功を確認
    logger.info(`[${step}] ✅ 完了 ID: ${result.id}, Date: ${result.date}, Items: ${result.items?.length || 0}件`);

    return result;

  } catch (error: any) {
    if (error.message === 'DUPLICATE_RECEIPT_DETECTED') throw error;
    logger.error(`[ERROR] ${step} フェーズ失敗: ${error.message}`);
    throw error;
  }
};