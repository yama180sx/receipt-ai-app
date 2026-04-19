import { PrismaClient } from '@prisma/client';
import { analyzeReceiptImage, ParsedReceipt } from './geminiService';
import { estimateCategoryId } from './categoryService';
import { validateReceiptItems } from './validationService'; 
import logger from '../utils/logger';
import { normalizeStoreName, getCleanText } from '../utils/normalizer';

const prisma = new PrismaClient();

const parseSafeDate = (dateStr: string | null | undefined): Date => {
  if (!dateStr) return new Date();
  const match = dateStr.match(/(\d{4})[-\/\.](\d{2})[-\/\.](\d{2})/);
  if (match) {
    const y = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    const d = parseInt(match[3], 10);
    const date = new Date(y, m - 1, d, 0, 0, 0, 0);
    if (!isNaN(date.getTime())) {
      logger.info(`[DATE_CHECK] パース成功: ${date.toLocaleDateString('ja-JP')}`);
      return date;
    }
  }
  logger.error(`[DATE_CHECK] パース失敗: "${dateStr}"。今日の日付を使用。`);
  return new Date();
};

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
    const cleanStore = getCleanText(officialStoreName);
    const jstDate = parseSafeDate(parsedData.purchaseDate);
    const totalAmount = Number(parsedData.totalAmount || 0);

    // 重複チェック
    const startOfDay = new Date(jstDate); startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(jstDate); endOfDay.setHours(23, 59, 59, 999);

    const existing = await prisma.receipt.findFirst({
      where: { familyGroupId, totalAmount, date: { gte: startOfDay, lte: endOfDay } },
      select: { id: true, storeName: true }
    });

    if (existing && getCleanText(existing.storeName) === cleanStore) {
      logger.warn(`[FINAL_FIX_DUPE] 重複検知: ID ${existing.id} / ${jstDate.toLocaleDateString()}`);
      const error = new Error('DUPLICATE_RECEIPT_DETECTED');
      (error as any).statusCode = 409;
      throw error;
    }

    const savedId = await prisma.$transaction(async (tx) => {
      const itemsToCreate = await Promise.all(parsedData.items.map(async (item) => {
        const cleanName = getCleanText(item.name);
        // ProductMaster (世帯別学習データ) を検索
        const mastered = await tx.productMaster.findUnique({
          where: { name_storeName_familyGroupId: { name: cleanName, storeName: cleanStore, familyGroupId } }
        });
        
        const finalCategoryId = mastered ? mastered.categoryId : await estimateCategoryId(cleanName, cleanStore, tx);

        return {
          name: item.name,
          price: Number(item.price || 0),
          quantity: Number(item.quantity || 1),
          categoryId: finalCategoryId
        };
      }));

      const created = await tx.receipt.create({
        data: {
          memberId, familyGroupId, storeName: officialStoreName, date: jstDate,
          totalAmount, imagePath, items: { create: itemsToCreate },
          rawText: JSON.stringify({ ...parsedData, validation: { isSuspicious, warnings } }),
        },
        select: { id: true }
      });
      return created.id;
    }, { timeout: 15000 });

    const final = await prisma.receipt.findUnique({
      where: { id: savedId },
      include: { items: { include: { category: true } } }
    });

    return { ...JSON.parse(JSON.stringify(final)), isSuspicious, warnings };

  } catch (error: any) {
    if (error.message === 'DUPLICATE_RECEIPT_DETECTED') throw error;
    logger.error(`[DB_ERROR] ${error}`);
    throw error;
  }
};

/**
 * レシートの解析からDB保存、トークンログの紐付けまでを制御します
 */
export const processAndSaveReceipt = async (memberId: number, imagePath: string) => {
  const member = await prisma.familyMember.findUnique({ 
    where: { id: memberId }, 
    select: { familyGroupId: true } 
  });
  if (!member) throw new Error('MEMBER_NOT_FOUND');

  // 1. Geminiで解析（トークンログは geminiService 内で作成される）
  const parsedData = await analyzeReceiptImage(imagePath, memberId);
  
  // 2. バリデーション
  const validation = validateReceiptItems(parsedData.items);
  
  // 3. レシートデータを保存
  const result = await saveParsedReceipt(
    memberId, 
    member.familyGroupId, 
    parsedData, 
    imagePath, 
    validation.isSuspicious, 
    validation.warnings
  );

  // 4. [Issue #59] 作成されたレシートIDをトークンログに紐付ける
  // 直近(1分以内)に作成された、このユーザーの未紐付けログを更新
  try {
    await prisma.apiUsageLog.updateMany({
      where: {
        familyMemberId: memberId,
        receiptId: null,
        createdAt: { gte: new Date(Date.now() - 60 * 1000) } // 1分以内のログ
      },
      data: {
        receiptId: result.id
      }
    });
  } catch (logError) {
    logger.error(`[LOG_LINK_ERROR] ログの紐付けに失敗しました: ${logError}`);
  }
  
  return result;
};