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
    if (!isNaN(date.getTime())) return date;
  }
  return new Date();
};

/**
 * [Issue #49-8] 解析のみを実行し、推論カテゴリを付与して返す
 */
export const analyzeOnly = async (memberId: number, imagePath: string) => {
  logger.info(`[Analyze] 解析開始: ${imagePath} (Member: ${memberId})`);
  
  // 1. ユーザーから世帯情報を取得
  const member = await prisma.familyMember.findUnique({
    where: { id: memberId },
    select: { familyGroupId: true }
  });
  const familyGroupId = member?.familyGroupId;

  // 2. Geminiで解析
  const parsedData = await analyzeReceiptImage(imagePath, memberId);
  const cleanStore = getCleanText(parsedData.storeName || '');

  // 3. 各明細にカテゴリを事前割り当て（デグレ修正）
  const itemsWithCategories = await Promise.all(parsedData.items.map(async (item) => {
    const cleanName = getCleanText(item.name);
    let initialCategoryId = null;

    if (familyGroupId) {
      // 学習マスタを優先
      const mastered = await prisma.productMaster.findUnique({
        where: { name_storeName_familyGroupId: { name: cleanName, storeName: cleanStore, familyGroupId } }
      });
      // マスタになければ推論
      initialCategoryId = mastered ? mastered.categoryId : await estimateCategoryId(cleanName, cleanStore, prisma);
    }

    return {
      ...item,
      categoryId: initialCategoryId
    };
  }));

  parsedData.items = itemsWithCategories;

  // 4. バリデーション
  const validation = validateReceiptItems(parsedData.items);
  
  return {
    parsedData,
    imagePath,
    validation
  };
};

/**
 * パース済みデータをDBに永続化する（重複チェック ＋ 世帯別学習機能）
 */
export const saveParsedReceipt = async (
  memberId: number, 
  familyGroupId: number,
  parsedData: any,
  imagePath: string,
  isSuspicious: boolean, 
  warnings: string[] 
) => {
  try {
    const officialStoreName = await normalizeStoreName(parsedData.storeName || '');
    const cleanStore = getCleanText(officialStoreName);
    const jstDate = parseSafeDate(parsedData.purchaseDate || parsedData.date);
    const totalAmount = Number(parsedData.totalAmount || 0);

    const startOfDay = new Date(jstDate); startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(jstDate); endOfDay.setHours(23, 59, 59, 999);

    const existing = await prisma.receipt.findFirst({
      where: { familyGroupId, totalAmount, date: { gte: startOfDay, lte: endOfDay } },
      select: { id: true, storeName: true }
    });

    if (existing && getCleanText(existing.storeName) === cleanStore) {
      const error = new Error('DUPLICATE_RECEIPT_DETECTED');
      (error as any).statusCode = 409;
      throw error;
    }

    const savedId = await prisma.$transaction(async (tx) => {
      const itemsToCreate = await Promise.all(parsedData.items.map(async (item: any) => {
        const cleanName = getCleanText(item.name);
        const finalCategoryId = item.categoryId ? Number(item.categoryId) : null;

        if (finalCategoryId) {
          await tx.productMaster.upsert({
            where: { name_storeName_familyGroupId: { name: cleanName, storeName: cleanStore, familyGroupId } },
            update: { categoryId: finalCategoryId },
            create: { name: cleanName, storeName: cleanStore, categoryId: finalCategoryId, familyGroupId }
          });
        }

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
    logger.error(`[DB_ERROR] ${error}`);
    throw error;
  }
};

export const saveConfirmedReceipt = async (
  memberId: number,
  familyGroupId: number,
  parsedData: any,
  imagePath: string,
  isSuspicious: boolean,
  warnings: string[]
) => {
  const result = await saveParsedReceipt(memberId, familyGroupId, parsedData, imagePath, isSuspicious, warnings);
  try {
    await prisma.apiUsageLog.updateMany({
      where: {
        familyMemberId: memberId,
        receiptId: null,
        createdAt: { gte: new Date(Date.now() - 15 * 60 * 1000) } 
      },
      data: { receiptId: result.id }
    });
  } catch (logError) {
    logger.error(`[LOG_LINK_ERROR] ログの紐付けに失敗しました: ${logError}`);
  }
  return result;
};

export const processAndSaveReceipt = async (memberId: number, imagePath: string) => {
  const member = await prisma.familyMember.findUnique({ where: { id: memberId }, select: { familyGroupId: true } });
  if (!member) throw new Error('MEMBER_NOT_FOUND');
  const { parsedData, validation } = await analyzeOnly(memberId, imagePath);
  return await saveConfirmedReceipt(memberId, member.familyGroupId, parsedData, imagePath, validation.isSuspicious, validation.warnings);
};