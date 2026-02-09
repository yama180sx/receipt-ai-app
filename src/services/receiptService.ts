import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * AI解析済みのレシートデータをDBに永続化する
 * schema.prisma の定義 (memberId, date, Item) に準拠
 */
export const saveParsedReceipt = async (memberId: number, parsedData: any) => {
  return await prisma.$transaction(async (tx) => {
    // 1. Receipt（親）を保存
    const receipt = await tx.receipt.create({
      data: {
        memberId: memberId,              // userId ではなく memberId
        storeName: parsedData.storeName || '不明な店舗',
        date: new Date(parsedData.purchaseDate || Date.now()), // purchaseDate ではなく date
        totalAmount: parsedData.totalAmount || 0,
        rawText: parsedData.rawText || null,

        // 2. Item（子）を同時に作成
        // モデル名が ReceiptItem ではなく Item なので注意
        items: {
          create: parsedData.items.map((item: any) => ({
            name: item.name,
            price: item.price,
            quantity: item.quantity || 1,
            categoryId: item.categoryId || null, // 任意項目
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