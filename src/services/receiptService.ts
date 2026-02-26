import { PrismaClient, Prisma } from '@prisma/client';
import { analyzeReceiptImage, ParsedReceipt } from './geminiService';
import logger from '../utils/logger';
import { normalizeStoreName, inferCategoryId } from '../utils/normalizer';

const prisma = new PrismaClient();

/**
 * AI解析済みのデータをDBに永続化する（正規化処理および画像パスの保存を含む）
 * @param memberId 家族メンバーID
 * @param parsedData Geminiからの解析結果
 * @param imagePath 保存されたレシート画像のパス (uploads/xxx.jpg)
 */
export const saveParsedReceipt = async (
  memberId: number, 
  parsedData: ParsedReceipt, 
  imagePath: string // [Issue #15] 引数追加
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

    return await prisma.$transaction(async (tx) => {
      // 2. レシートの作成
      const receipt = await tx.receipt.create({
        data: {
          memberId: memberId,
          storeName: officialStoreName,
          date: jstDate,
          totalAmount: parsedData.totalAmount || 0,
          rawText: JSON.stringify(parsedData),
          imagePath: imagePath, // [Issue #15] DBカラムにパスを保存
          items: {
            create: await Promise.all(parsedData.items.map(async (item) => ({
              name: item.name,
              price: item.price,
              quantity: item.quantity || 1,
              // 商品名とAI推論カテゴリーからIDを特定
              categoryId: await inferCategoryId(item.name, item.inferredCategory)
            }))),
          },
        },
        include: {
          items: true,
        },
      });
      return receipt;
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      switch (error.code) {
        case 'P2002':
          logger.error(`[DBエラー] 一意制約違反: target: ${error.meta?.target}`);
          break;
        case 'P2003':
          logger.error(`[DBエラー] 外部キー制約違反: memberId (${memberId}) が存在しません。`);
          break;
        default:
          logger.error(`[DBエラー] Prismaエラーコード: ${error.code}`, { message: error.message });
      }
    } else if (error instanceof Prisma.PrismaClientValidationError) {
      logger.error("[DBエラー] バリデーションエラー: スキーマ不整合", { error });
    } else {
      logger.error("[DBエラー] 未知のデータベースエラー", { error });
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
    
    logger.debug(`[${step}] Raw Analysis Data:`, { parsedData });
    logger.info(`[${step}] ✅ 解析成功`);

    step = 'DB_PERSISTENCE';
    logger.info(`[${step}] 保存開始 memberId: ${memberId}`);
    
    // [Issue #15] imagePath を saveParsedReceipt に渡す
    const result = await saveParsedReceipt(memberId, parsedData, imagePath);
    
    const duration = Date.now() - startTime;
    
    logger.info(`[${step}] ✅ DB保存成功 ID: ${result.id}`, { 
      durationMs: duration,
      imageSavedPath: result.imagePath, // ログで確認用
      savedItems: result.items.map(i => ({
        name: i.name,
        categoryId: i.categoryId,
        price: i.price
      }))
    });

    return result;

  } catch (error: any) {
    logger.error(`[ERROR] ${step} フェーズで失敗しました。`, { 
      step, 
      memberId, 
      errorMessage: error.message 
    });
    
    if (step === 'DB_PERSISTENCE' && parsedData) {
      logger.warn("解析データバックアップ", { parsedData });
    }

    throw error;
  }
};