import { PrismaClient } from '@prisma/client';
import { analyzeReceiptImage, ParsedReceipt } from './geminiService';
import { estimateCategoryId } from './categoryService';
import { validateReceiptItems } from './validationService'; 
import logger from '../utils/logger';
import { normalizeStoreName, getCleanText } from '../utils/normalizer';

const prisma = new PrismaClient();

/**
 * [Issue #71] 文字列からDateオブジェクトを生成する (HH:mm 対応版)
 * Geminiから返却される "YYYY-MM-DD HH:mm" を正確にパースします。
 */
const parseSafeDate = (dateStr: string | null | undefined): Date => {
  if (!dateStr) return new Date();
  
  // YYYY-MM-DD HH:mm または YYYY-MM-DD の形式を抽出
  const match = dateStr.match(/(\d{4})[-\/\.](\d{2})[-\/\.](\d{2})(?:\s+(\d{2}):(\d{2}))?/);
  
  if (match) {
    const y = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    const d = parseInt(match[3], 10);
    const hh = match[4] ? parseInt(match[4], 10) : 0;
    const mm = match[5] ? parseInt(match[5], 10) : 0;
    
    // タイムゾーンによるズレを防ぐため、OSローカル（JST前提）で生成
    const date = new Date(y, m - 1, d, hh, mm, 0, 0);
    if (!isNaN(date.getTime())) {
      return date;
    }
  }
  
  // パース失敗時のフォールバック
  const fallback = new Date(dateStr);
  return isNaN(fallback.getTime()) ? new Date() : fallback;
};

/**
 * [Issue #49-8] 解析のみを実行し、推論カテゴリを付与して返す
 */
export const analyzeOnly = async (memberId: number, imagePath: string) => {
  logger.info(`[Analyze] 解析開始: ${imagePath} (Member: ${memberId})`);
  
  const member = await prisma.familyMember.findUnique({
    where: { id: memberId },
    select: { familyGroupId: true }
  });
  const familyGroupId = member?.familyGroupId;

  // Geminiで解析 (taxAmount, HH:mm を含む ParsedReceipt が返る)
  const parsedData = await analyzeReceiptImage(imagePath, memberId);
  const cleanStore = getCleanText(parsedData.storeName || '');

  // 各明細にカテゴリを事前割り当て
  const itemsWithCategories = await Promise.all(parsedData.items.map(async (item) => {
    const cleanName = getCleanText(item.name);
    let initialCategoryId = null;

    if (familyGroupId) {
      const mastered = await prisma.productMaster.findUnique({
        where: { name_storeName_familyGroupId: { name: cleanName, storeName: cleanStore, familyGroupId } }
      });
      initialCategoryId = mastered ? mastered.categoryId : await estimateCategoryId(cleanName, cleanStore, prisma);
    }

    return {
      ...item,
      categoryId: initialCategoryId
    };
  }));

  parsedData.items = itemsWithCategories;

  // バリデーション (items合計 + taxAmount = totalAmount のチェック等)
  const validation = validateReceiptItems(parsedData.items);
  
  return {
    parsedData,
    imagePath,
    validation
  };
};

/**
 * パース済みデータをDBに永続化する（重複チェック ＋ 世帯別学習機能）
 * [Update] taxAmount, price, quantity を Float として保存
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
    
    // Receipt.totalAmount は Int、taxAmount は Float
    const totalAmount = Math.round(Number(parsedData.totalAmount || 0));
    const taxAmount = parseFloat(String(parsedData.taxAmount || 0));

    /**
     * 重複チェックの強化:
     * 1. 時刻が 00:00 の場合は、従来通り 1日単位でチェック
     * 2. 時刻がある場合は、前後1分以内の同一金額レシートをチェック
     */
    let duplicateWhere: any = { 
      familyGroupId, 
      totalAmount,
    };

    if (jstDate.getHours() === 0 && jstDate.getMinutes() === 0) {
      const startOfDay = new Date(jstDate); startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(jstDate); endOfDay.setHours(23, 59, 59, 999);
      duplicateWhere.date = { gte: startOfDay, lte: endOfDay };
    } else {
      // 時刻の前後1分を許容（AIによる微小な読み取り誤差を考慮）
      const margin = 1 * 60 * 1000;
      duplicateWhere.date = { 
        gte: new Date(jstDate.getTime() - margin), 
        lte: new Date(jstDate.getTime() + margin) 
      };
    }

    const existing = await prisma.receipt.findFirst({
      where: duplicateWhere,
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
          price: parseFloat(String(item.price || 0)),
          quantity: parseFloat(String(item.quantity || 1)),
          categoryId: finalCategoryId
        };
      }));

      const created = await tx.receipt.create({
        data: {
          memberId, 
          familyGroupId, 
          storeName: officialStoreName, 
          date: jstDate,
          totalAmount, 
          taxAmount, // [Issue #71] 追加
          imagePath, 
          items: { create: itemsToCreate },
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
    if (error.statusCode === 409) throw error;
    logger.error(`[DB_ERROR] ${error}`);
    throw error;
  }
};

/**
 * ユーザー確認済みデータの永続化とログ紐付け
 */
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

/**
 * 解析〜保存の一括処理（レガシー/Worker用）
 */
export const processAndSaveReceipt = async (memberId: number, imagePath: string) => {
  const member = await prisma.familyMember.findUnique({ 
    where: { id: memberId }, 
    select: { familyGroupId: true } 
  });
  if (!member) throw new Error('MEMBER_NOT_FOUND');
  
  const { parsedData, validation } = await analyzeOnly(memberId, imagePath);
  return await saveConfirmedReceipt(
    memberId, 
    member.familyGroupId, 
    parsedData, 
    imagePath, 
    validation.isSuspicious, 
    validation.warnings
  );
};