import { prisma } from '../../utils/prismaClient';
import type {
  ClassificationConfidence,
  ClassificationSource,
  ProductClassificationCandidateSource,
  ProductTypeStatus,
} from '@prisma/client';
import type { PrismaTx } from '../../utils/prismaTransaction';
import { AppError } from '../../utils/appError';
import { getCleanText } from '../../utils/normalizer';

export async function deleteReceiptById(receiptId: number, familyGroupId: number) {
  const existing = await prisma.receipt.findUnique({ where: { id: receiptId } });
  if (!existing || existing.familyGroupId !== familyGroupId) {
    throw new AppError('ReceiptNotFound', 404);
  }
  await prisma.receipt.delete({ where: { id: receiptId } });
}

export type ReceiptCreateWithItemsInput = {
  memberId: number;
  familyGroupId: number;
  storeName: string;
  normalizedStoreName: string;
  date: Date;
  totalAmount: number;
  taxAmount: number;
  imagePath: string;
  rawText: string;
  items: Array<{
    name: string;
    normalizedName: string;
    price: number;
    quantity: number;
    categoryId: number | null;
    standardCategoryId: number | null;
    productTypeId: number | null;
    productTypeStatus: ProductTypeStatus;
    classificationSource: ClassificationSource | null;
    classificationConfidence: ClassificationConfidence | null;
    productClassificationCandidates?: Array<{
      productTypeId: number;
      source: ProductClassificationCandidateSource;
      matchedNormalizedName: string;
      similarity: number;
      rank: number;
    }>;
  }>;
};

/** commit トランザクション内で Receipt を作成（#98-4 tx 渡し） */
export async function createReceiptInTx(tx: PrismaTx, input: ReceiptCreateWithItemsInput) {
  return tx.receipt.create({
    data: {
      memberId: input.memberId,
      familyGroupId: input.familyGroupId,
      storeName: input.storeName,
      normalizedStoreName: input.normalizedStoreName,
      date: input.date,
      totalAmount: input.totalAmount,
      taxAmount: input.taxAmount,
      imagePath: input.imagePath,
      items: {
        create: input.items.map(({ productClassificationCandidates = [], ...item }) => ({
          ...item,
          productClassificationCandidates: productClassificationCandidates.length
            ? { create: productClassificationCandidates }
            : undefined,
        })),
      },
      rawText: input.rawText,
    },
    select: { id: true },
  });
}

export async function linkApiUsageLogToReceiptInTx(
  tx: PrismaTx,
  usageLogId: number,
  receiptId: number
) {
  return tx.apiUsageLog.update({
    where: { id: usageLogId },
    data: { receiptId },
  });
}

export async function updateReceiptInTx(
  tx: PrismaTx,
  receiptId: number,
  data: { date?: Date; storeName?: string; normalizedStoreName?: string; totalAmount?: number }
) {
  return tx.receipt.update({
    where: { id: receiptId },
    data: {
      date: data.date,
      storeName: data.storeName,
      normalizedStoreName: data.normalizedStoreName,
      totalAmount: data.totalAmount,
    },
  });
}

export async function updateReceiptStoreNamesInTx(
  tx: PrismaTx,
  familyGroupId: number,
  sourceStoreName: string,
  targetStoreName: string
) {
  return tx.receipt.updateMany({
    where: { storeName: sourceStoreName, familyGroupId },
    data: { storeName: targetStoreName, normalizedStoreName: getCleanText(targetStoreName) },
  });
}

export type ItemCreateInput = {
  receiptId: number;
  name: string;
  normalizedName: string;
  price: number;
  quantity: number;
  categoryId: number | null;
  standardCategoryId: number | null;
  productTypeId: number | null;
  productTypeStatus: ProductTypeStatus;
  classificationSource: ClassificationSource | null;
  classificationConfidence: ClassificationConfidence | null;
  productClassificationCandidates?: Array<{
    productTypeId: number;
    source: ProductClassificationCandidateSource;
    matchedNormalizedName: string;
    similarity: number;
    rank: number;
  }>;
};

export async function deleteItemsByReceiptIdInTx(tx: PrismaTx, receiptId: number) {
  return tx.item.deleteMany({ where: { receiptId } });
}

export async function createItemsInTx(tx: PrismaTx, items: ItemCreateInput[]) {
  if (items.length === 0) return;
  return Promise.all(
    items.map(({ productClassificationCandidates = [], ...item }) =>
      tx.item.create({
        data: {
          ...item,
          productClassificationCandidates: productClassificationCandidates.length
            ? { create: productClassificationCandidates }
            : undefined,
        },
      })
    )
  );
}

export async function updateItemCategoryInTx(
  tx: PrismaTx,
  itemId: number,
  data: Pick<
    ItemCreateInput,
    | 'categoryId'
    | 'standardCategoryId'
    | 'productTypeId'
    | 'productTypeStatus'
    | 'classificationSource'
    | 'classificationConfidence'
  >
) {
  return tx.item.update({
    where: { id: itemId },
    data,
    include: { category: true, productType: true },
  });
}

export async function deleteItemSplitsInTx(tx: PrismaTx, itemId: number) {
  return tx.itemSplit.deleteMany({ where: { itemId } });
}

export async function createItemSplitsInTx(
  tx: PrismaTx,
  splits: Array<{ itemId: number; familyMemberId: number; amount: number }>
) {
  if (splits.length === 0) return;
  return tx.itemSplit.createMany({ data: splits });
}
