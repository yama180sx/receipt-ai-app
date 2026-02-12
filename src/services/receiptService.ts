import { PrismaClient, Prisma } from '@prisma/client'; // Prismaをインポート
import { analyzeReceiptImage, ParsedReceipt } from './geminiService';

const prisma = new PrismaClient();

/**
 * 【強化版】AI解析済みのデータをDBに永続化する
 */
export const saveParsedReceipt = async (memberId: number, parsedData: ParsedReceipt) => {
  try {
    return await prisma.$transaction(async (tx) => {
      const receipt = await tx.receipt.create({
        data: {
          memberId: memberId,
          storeName: parsedData.storeName || '不明な店舗',
          date: new Date(parsedData.purchaseDate || Date.now()),
          totalAmount: parsedData.totalAmount || 0,
          rawText: JSON.stringify(parsedData),
          items: {
            create: parsedData.items.map((item) => ({
              name: item.name,
              price: item.price,
              quantity: item.quantity || 1,
            })),
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
      // Prisma特有のエラーハンドリング
      switch (error.code) {
        case 'P2002':
          console.error(`❌ [DBエラー] 一意制約違反: 重複したデータが存在します。(${error.meta?.target})`);
          break;
        case 'P2003':
          console.error(`❌ [DBエラー] 外部キー制約違反: 指定された memberId (${memberId}) が存在しません。`);
          break;
        case 'P2025':
          console.error(`❌ [DBエラー] レコードが見つかりません。`);
          break;
        default:
          console.error(`❌ [DBエラー] Prismaエラーコード: ${error.code}`, error.message);
      }
    } else if (error instanceof Prisma.PrismaClientValidationError) {
      console.error("❌ [DBエラー] バリデーションエラー: スキーマとデータの型が一致しません。");
    } else {
      console.error("❌ [DBエラー] 未知のデータベースエラーが発生しました。");
    }
    
    // 上位の processAndSaveReceipt にエラーを伝播させ、解析データのログ出力をトリガーさせる
    throw error;
  }
};

/**
 * 【強化版】画像解析からDB保存までを統合する
 */
export const processAndSaveReceipt = async (memberId: number, imagePath: string) => {
  let step = 'INITIALIZING';
  let parsedData: ParsedReceipt | null = null;

  try {
    // 1. Geminiで解析
    step = 'GEMINI_ANALYSIS';
    console.log(`[${step}] 解析開始: ${imagePath}`);
    parsedData = await analyzeReceiptImage(imagePath);
    console.log(`[${step}] ✅ 解析成功`);

    // 2. 解析結果をDBへ保存
    step = 'DB_PERSISTENCE';
    console.log(`[${step}] 保存開始 (Member: ${memberId})`);
    const result = await saveParsedReceipt(memberId, parsedData);
    console.log(`[${step}] ✅ DB保存成功 (ID: ${result.id})`);

    return result;

  } catch (error: any) {
    // ステップごとに詳細なエラーログを出力
    console.error(`❌ [ERROR] ${step} フェーズで失敗しました。`);
    
    if (step === 'DB_PERSISTENCE' && parsedData) {
      // 解析には成功したが保存に失敗した場合、データをロストしないようログに吐き出す
      console.error("💡 ヒント: 解析データは正常に取得できていました。DBの制約を確認してください。");
      console.error("解析済みデータ内容:", JSON.stringify(parsedData, null, 2));
    }

    // 上位（呼び出し元）には元々のエラーを投げる
    throw error;
  }
};