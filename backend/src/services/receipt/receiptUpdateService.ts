import { AppError } from '../../utils/appError';
import { runInTransaction, type PrismaTx } from '../../utils/prismaTransaction';
import type { ReceiptCreateItemInput } from '../../types/receipt';
import type { TenantContext } from '../../utils/context';
import { saveParsedReceipt } from './receiptPersistenceService';
import { upsertProductMasterCategory } from './receiptProductMasterLearning';

export type ManualReceiptInput = {
  date: string;
  storeName: string;
  items: ReceiptCreateItemInput[];
  imagePath?: string;
};

function buildCommitPayload(input: ManualReceiptInput) {
  const typedItems = input.items;
  const calculatedTotal = typedItems.reduce((sum, i) => {
    return sum + Number(i.price || 0) * Number(i.quantity || 0);
  }, 0);

  return {
    storeName: input.storeName,
    purchaseDate: input.date,
    totalAmount: Math.round(calculatedTotal),
    items: typedItems.map((i) => ({
      name: i.name,
      price: parseFloat(String(i.price)),
      quantity: parseFloat(String(i.quantity || 1)),
      categoryId: i.categoryId ? Number(i.categoryId) : null,
    })),
  };
}

/** 手動登録（解析 usageLogId 紐付けなし） */
export async function createManualReceipt(ctx: TenantContext, input: ManualReceiptInput) {
  const payload = buildCommitPayload(input);
  return saveParsedReceipt(ctx.memberId, ctx.familyGroupId, payload, input.imagePath || '', false, []);
}

export type UpdateReceiptInput = {
  date?: string;
  storeName?: string;
  items?: ReceiptCreateItemInput[];
};

async function updateReceiptInTx(
  tx: PrismaTx,
  receiptId: number,
  familyGroupId: number,
  input: UpdateReceiptInput
) {
  const { date, storeName, items } = input;

  const existing = await tx.receipt.findUnique({
    where: { id: receiptId },
  });
  if (!existing || existing.familyGroupId !== familyGroupId) {
    throw new AppError('ReceiptNotFound', 404);
  }

  const itemList = items ?? [];
  const calculatedTotal = itemList.reduce((sum, i) => {
    return sum + Number(i.price || 0) * Number(i.quantity || 0);
  }, 0);
  const finalTotal = Math.round(calculatedTotal);

  await tx.receipt.update({
    where: { id: receiptId },
    data: {
      date: date ? new Date(date) : undefined,
      storeName: storeName || undefined,
      totalAmount: finalTotal,
    },
  });

  await tx.item.deleteMany({ where: { receiptId } });

  if (itemList.length > 0) {
    await tx.item.createMany({
      data: itemList.map((i) => ({
        receiptId,
        name: i.name,
        price: parseFloat(String(i.price)) || 0,
        quantity: parseFloat(String(i.quantity)) || 0,
        categoryId: i.categoryId ? Number(i.categoryId) : null,
      })),
    });

    const resolvedStoreName = storeName || existing.storeName;
    for (const item of itemList) {
      if (item.categoryId) {
        await upsertProductMasterCategory(tx, {
          itemName: item.name,
          storeName: resolvedStoreName,
          familyGroupId,
          categoryId: Number(item.categoryId),
        });
      }
    }
  }

  return tx.receipt.findUnique({
    where: { id: receiptId },
    include: { items: { include: { category: true } } },
  });
}

/** 保存済みレシートの完全編集 */
export async function updateReceiptById(
  receiptId: number,
  familyGroupId: number,
  input: UpdateReceiptInput
) {
  return runInTransaction((tx) => updateReceiptInTx(tx, receiptId, familyGroupId, input));
}

async function updateItemCategoryInTx(
  tx: PrismaTx,
  itemId: number,
  familyGroupId: number,
  categoryId: number | null | undefined
) {
  const currentItem = await tx.item.findUnique({
    where: { id: itemId },
    include: { receipt: true },
  });

  if (!currentItem || currentItem.receipt.familyGroupId !== familyGroupId) {
    throw new AppError('ItemNotFound', 404);
  }

  if (categoryId) {
    const category = await tx.category.findFirst({
      where: { id: Number(categoryId), familyGroupId },
    });
    if (!category) throw new AppError('CategoryNotFound', 404);
  }

  const updatedItem = await tx.item.update({
    where: { id: itemId },
    data: { categoryId: categoryId ? Number(categoryId) : null },
    include: { category: true },
  });

  if (categoryId) {
    await upsertProductMasterCategory(tx, {
      itemName: currentItem.name,
      storeName: currentItem.receipt.storeName,
      familyGroupId,
      categoryId: Number(categoryId),
    });
  }

  return updatedItem;
}

/** 明細カテゴリ更新 ＋ 学習マスタ反映 */
export async function updateItemCategoryById(
  itemId: number,
  familyGroupId: number,
  categoryId: number | null | undefined
) {
  return runInTransaction((tx) => updateItemCategoryInTx(tx, itemId, familyGroupId, categoryId));
}
