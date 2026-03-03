import { PrismaClient, Prisma } from '@prisma/client';
import { analyzeReceiptImage, ParsedReceipt } from './geminiService';
import logger from '../utils/logger';
import { normalizeStoreName, inferCategoryId, getCleanText } from '../utils/normalizer'; // getCleanTextを追加

const prisma = new PrismaClient();

/**
 * AI解析済みのデータをDBに永続化する（正規化処理および画像パスの保存を含む）
 */
export const saveParsedReceipt = async (
  memberId: number, 
  parsedData: ParsedReceipt, 
  imagePath: string 
) => {
  try {
    // 1. 店舗名の正規化（内部で正規化処理が行われる）
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
      // --- Issue #13: アイテムごとのカテゴリ決定ロジック ---
      const itemsToCreate = await Promise.all(parsedData.items.map(async (item) => {
        
        // 【修正】検索キーを正規化して、学習時のデータと確実に一致させる
        const cleanItemName = getCleanText(item.name);
        const cleanStoreName = getCleanText(officialStoreName);

        // --- Issue #13: ユーザーの過去修正に基づく自動カテゴリー適用 ---
        // AIの推論結果を ProductMaster(学習データ) で補正する
        const masteredItem = await tx.productMaster.findUnique({
          where: {
            name_storeName: {
              name: cleanItemName, // 正規化後の名前で検索
              storeName: cleanStoreName
            }
          }
        });

        let finalCategoryId: number | null;

        if (masteredItem) {
          // ユーザーが過去に修正したデータを優先適用
          finalCategoryId = masteredItem.categoryId;
          logger.info(`[学習適用] 商品: "${item.name}" (正規化キー: "${cleanItemName}") -> 過去の修正に基づき CategoryID: ${finalCategoryId} を自動設定`);
        } else {
          // 学習データがなければAIの推論結果を使用（内部で正規化してマッチングを行う）
          finalCategoryId = await inferCategoryId(item.name, item.inferredCategory);
          logger.debug(`[AI推論適用] 商品: "${item.name}" -> CategoryID: ${finalCategoryId}`);
        }

        return {
          name: item.name,
          price: item.price,
          quantity: item.quantity || 1,
          categoryId: finalCategoryId
        };
      }));

      // 2. レシートおよびアイテムの一括作成
      const receipt = await tx.receipt.create({
        data: {
          memberId: memberId,
          storeName: officialStoreName,
          date: jstDate,
          totalAmount: parsedData.totalAmount || 0,
          rawText: JSON.stringify(parsedData),
          imagePath: imagePath,
          items: {
            create: itemsToCreate
          },
        },
        include: {
          items: {
            include: { category: true }
          },
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
    } else {
      logger.error("[DBエラー] データベース保存中に予期せぬエラーが発生しました", { error });
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
    
    logger.info(`[${step}] ✅ DB保存・学習適用完了 ID: ${result.id}`, { 
      durationMs: duration,
      imageSavedPath: result.imagePath,
      savedItems: result.items.map(i => ({
        name: i.name,
        categoryName: i.category?.name || '未分類',
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