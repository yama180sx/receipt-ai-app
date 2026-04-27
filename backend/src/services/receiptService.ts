import { PrismaClient } from '@prisma/client';
import { analyzeReceiptImage, ParsedReceipt } from './geminiService';
import { estimateCategoryId } from './categoryService';
import { validateReceiptItems } from './validationService'; 
import logger from '../utils/logger';
import { normalizeStoreName, getCleanText } from '../utils/normalizer';

const prisma = new PrismaClient();

/**
 * 文字列から安全にDateオブジェクトを生成する
 */
const parseSafeDate = (dateStr: string | null | undefined): Date => {
  if (!dateStr) return new Date();
  const match = dateStr.match(/(\d{4})[-\/\.](\d{2})[-\/\.](\d{2})/);
  if (match) {
    const y = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    const d = parseInt(match[3], 10);
    const date = new Date(y, m - 1, d, 0, 0, 0, 0);
    if (!isNaN(date.getTime())) {
      return date;
    }
  }
  return new Date();
};

/**
 * [Issue #49-8] 解析のみを実行し、結果を返す（DB保存は行わない）
 * ジョブキューのWorkerから呼び出されることを想定
 */
export const analyzeOnly = async (memberId: number, imagePath: string) => {
  logger.info(`[Analyze] 解析開始: ${imagePath} (Member: ${memberId})`);
  
  // 1. Geminiで解析
  const parsedData = await analyzeReceiptImage(imagePath, memberId);
  
  // 2. 基本的なバリデーションを実行
  const validation = validateReceiptItems(parsedData.items);
  
  // 解析結果、画像パス、バリデーション結果をフロントエンド確認用に返却
  return {
    parsedData,
    imagePath,
    validation
  };
};

/**
 * パース済みデータをDBに永続化する（重複チェック含む）
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
    const cleanStore = getCleanText(officialStoreName);
    const jstDate = parseSafeDate(parsedData.purchaseDate);
    const totalAmount = Number(parsedData.totalAmount || 0);

    // 1. 重複チェック
    const startOfDay = new Date(jstDate); startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(jstDate); endOfDay.setHours(23, 59, 59, 999);

    const existing = await prisma.receipt.findFirst({
      where: { familyGroupId, totalAmount, date: { gte: startOfDay, lte: endOfDay } },
      select: { id: true, storeName: true }
    });

    if (existing && getCleanText(existing.storeName) === cleanStore) {
      logger.warn(`[DupeCheck] 重複検知: ID ${existing.id} / ${jstDate.toLocaleDateString()}`);
      const error = new Error('DUPLICATE_RECEIPT_DETECTED');
      (error as any).statusCode = 409;
      throw error;
    }

    // 2. トランザクションによる保存
    const savedId = await prisma.$transaction(async (tx) => {
      const itemsToCreate = await Promise.all(parsedData.items.map(async (item) => {
        const cleanName = getCleanText(item.name);
        
        // カテゴリが既に指定（ユーザー編集済み）されているか確認
        // 指定がない場合はマスタまたは推論から決定
        let finalCategoryId: number | null = null;
        
        if (item.inferredCategory) {
          // フロントエンドからカテゴリ名（またはID）が渡されている場合の処理ロジック（拡張用）
          // 現状の ParsedItem に categoryId を持たせる改修も検討可能
        }

        if (!finalCategoryId) {
          // ProductMaster (世帯別学習データ) を検索
          const mastered = await tx.productMaster.findUnique({
            where: { name_storeName_familyGroupId: { name: cleanName, storeName: cleanStore, familyGroupId } }
          });
          finalCategoryId = mastered ? mastered.categoryId : await estimateCategoryId(cleanName, cleanStore, tx);
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
    if (error.message === 'DUPLICATE_RECEIPT_DETECTED') throw error;
    logger.error(`[DB_ERROR] ${error}`);
    throw error;
  }
};

/**
 * [Issue #49-8] ユーザーが確認・修正した内容を確定保存する
 */
export const saveConfirmedReceipt = async (
  memberId: number,
  familyGroupId: number,
  parsedData: ParsedReceipt,
  imagePath: string,
  isSuspicious: boolean,
  warnings: string[]
) => {
  // 1. データを保存
  const result = await saveParsedReceipt(
    memberId,
    familyGroupId,
    parsedData,
    imagePath,
    isSuspicious,
    warnings
  );

  // 2. [Issue #59] API Usage Log との紐付け
  // 解析からユーザー確認まで時間がかかるため、過去10分以内の未紐付けログを対象にする
  try {
    await prisma.apiUsageLog.updateMany({
      where: {
        familyMemberId: memberId,
        receiptId: null,
        createdAt: { gte: new Date(Date.now() - 10 * 60 * 1000) } 
      },
      data: { receiptId: result.id }
    });
  } catch (logError) {
    logger.error(`[LOG_LINK_ERROR] ログの紐付けに失敗しました: ${logError}`);
  }
  
  return result;
};

/**
 * 従来の「解析〜保存」一括フロー（Worker用または後方互換用）
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