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
 * [Issue #49-8 / #72 / #63] 解析のみを実行し、推論カテゴリを付与して返す
 * 戻り値に usageLogId を含めるように拡張
 */
export const analyzeOnly = async (memberId: number, imagePath: string) => {
  logger.info(`[Analyze] 解析開始: ${imagePath} (Member: ${memberId})`);
  
  const member = await prisma.familyMember.findUnique({
    where: { id: memberId },
    select: { familyGroupId: true }
  });
  const familyGroupId = member?.familyGroupId;

  // Geminiで解析 (taxAmount, HH:mm, usageLogId を含む ParsedReceipt が返る)
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
      price: parseFloat(String(item.price || 0)),         // ガソリンスタンド等の小数対応
      quantity: parseFloat(String(item.quantity || 1)),   // リットル等の小数対応
      categoryId: initialCategoryId
    };
  }));

  parsedData.items = itemsWithCategories;
  parsedData.taxAmount = parsedData.taxAmount ? parseFloat(String(parsedData.taxAmount)) : undefined;

  // バリデーション (items合計 + taxAmount = totalAmount のチェック等)
  const validation = validateReceiptItems(parsedData.items);
  
  return {
    parsedData, // usageLogId が含まれる
    imagePath,
    validation
  };
};

/**
 * パース済みデータをDBに永続化する（重複チェック ＋ 世帯別学習機能）
 * [Issue #63 / #72] 1対1の確実な ApiUsageLog 紐付けをトランザクション内で実行
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
    const taxAmount = parsedData.taxAmount ? parseFloat(String(parsedData.taxAmount)) : 0;
    
    // 安全な数値キャスト（NaNガード付き）
    const usageLogIdStr = parsedData.usageLogId !== undefined ? String(parsedData.usageLogId) : null;
    const usageLogId = usageLogIdStr ? parseInt(usageLogIdStr, 10) : null;

    /**
     * 重複チェック
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
      const margin = 1 * 60 * 1000; // 前後1分
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

      // 1. Receiptの作成
      const created = await tx.receipt.create({
        data: {
          memberId, 
          familyGroupId, 
          storeName: officialStoreName, 
          date: jstDate,
          totalAmount, 
          taxAmount, 
          imagePath, 
          items: { create: itemsToCreate },
          rawText: JSON.stringify({ ...parsedData, validation: { isSuspicious, warnings } }),
        },
        select: { id: true }
      });

      // 2. [Issue #63] usageLogId が有効な数値の場合、ピンポイントで紐付けを更新
      if (usageLogId && !isNaN(usageLogId)) {
        await tx.apiUsageLog.update({
          where: { id: usageLogId },
          data: { receiptId: created.id }
        });
        logger.info(`[Link_Log] ApiUsageLog(ID: ${usageLogId}) を Receipt(ID: ${created.id}) に紐付けました。`);
      }

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
 * ユーザー確認済みデータの永続化
 * [Issue #63] 曖昧なupdateManyを廃止し、saveParsedReceiptの内部トランザクションへ委譲
 */
export const saveConfirmedReceipt = async (
  memberId: number,
  familyGroupId: number,
  parsedData: any,
  imagePath: string,
  isSuspicious: boolean,
  warnings: string[]
) => {
  return await saveParsedReceipt(memberId, familyGroupId, parsedData, imagePath, isSuspicious, warnings);
};

/**
 * 解析〜保存の一括処理（Worker用/自動投入用）
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