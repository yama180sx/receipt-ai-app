import { PrismaClient } from '@prisma/client';
import { analyzeReceiptImage, ParsedReceipt } from './geminiService'; // Gemini連携をインポート

const prisma = new PrismaClient();

/**
 * 【既存ロジック】AI解析済みのデータをDBに永続化する
 */
export const saveParsedReceipt = async (memberId: number, parsedData: ParsedReceipt) => {
  return await prisma.$transaction(async (tx) => {
    const receipt = await tx.receipt.create({
      data: {
        memberId: memberId,
        storeName: parsedData.storeName || '不明な店舗',
        date: new Date(parsedData.purchaseDate || Date.now()),
        totalAmount: parsedData.totalAmount || 0,
        // rawText が ParsedReceipt にない場合は null か解析結果を文字列化
        rawText: JSON.stringify(parsedData), 

        items: {
          create: parsedData.items.map((item) => ({
            name: item.name,
            price: item.price,
            quantity: item.quantity || 1,
            // categoryId は必要に応じて後でロジック追加
          })),
        },
      },
      include: {
        items: true,
      },
    });
    return receipt;
  });
};

/**
 * 【新規追加】画像解析からDB保存までを統合する
 */
export const processAndSaveReceipt = async (memberId: number, imagePath: string) => {
  console.log(`--- 🏁 統合プロセス開始: ${imagePath} ---`);
  
  // 1. Geminiで解析
  const parsedData = await analyzeReceiptImage(imagePath);
  console.log("✅ Gemini解析成功");

  // 2. 解析結果をDBへ保存 (既存の saveParsedReceipt を再利用)
  const result = await saveParsedReceipt(memberId, parsedData);
  console.log(`✅ DB保存成功 (Receipt ID: ${result.id})`);

  return result;
};