import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * レシートと明細をトランザクション内で保存する
 */
export async function saveReceiptTransaction(data: {
  storeName: string;
  transactionDate: Date;
  totalAmount: number;
  familyMemberId: number;
  items: {
    name: string;
    price: number;
    quantity: number;
    categoryId?: number;
  }[];
}) {
  return await prisma.$transaction(async (tx) => {
    // 1. レシート親レコードの作成
    const receipt = await tx.receipt.create({
      data: {
        storeName: data.storeName,
        transactionDate: data.transactionDate,
        totalAmount: data.totalAmount,
        familyMemberId: data.familyMemberId,
      },
    });

    // 2. 明細レコードの子レコード群を一括作成
    // Prisma v5以降であれば createMany も使えますが、
    // 関連を持たせた確実な作成のため、ここでは基本的な map 展開を提示します
    const items = await Promise.all(
      data.items.map((item) =>
        tx.receiptItem.create({
          data: {
            ...item,
            receiptId: receipt.id, // 親のIDを紐付け
          },
        })
      )
    );

    return { receipt, items };
  });
}