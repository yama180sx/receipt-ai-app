import { AppError } from '../../utils/appError';
import { getCleanText } from '../../utils/normalizer';
import { runInTransaction, type PrismaTx } from '../../utils/prismaTransaction';
import type { ReceiptCreateItemInput } from '../../types/receipt';
import type { TenantContext } from '../../utils/context';
import {
  createItemsInTx,
  deleteItemsByReceiptIdInTx,
  findCategoryByIdInTx,
  findItemWithReceiptInTx,
  findReceiptByIdForTenantInTx,
  findReceiptByIdInTx,
  updateItemCategoryInTx,
  updateReceiptInTx as patchReceiptInTx,
} from '../../repositories/receiptRepository';
import { saveParsedReceipt } from './receiptPersistenceService';
import {
  classifyItemWithSimilarityCandidates,
  toProductClassificationCandidateInputs,
} from '../productClassification/productClassificationService';
import { replaceProductClassificationCandidatesInTx } from '../../repositories/productClassificationRepository';

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

async function applyFullReceiptUpdateInTx(
  tx: PrismaTx,
  receiptId: number,
  familyGroupId: number,
  input: UpdateReceiptInput
) {
  const { date, storeName, items } = input;

  const existing = await findReceiptByIdForTenantInTx(tx, receiptId, familyGroupId);

  const itemList = items ?? [];
  const calculatedTotal = itemList.reduce((sum, i) => {
    return sum + Number(i.price || 0) * Number(i.quantity || 0);
  }, 0);
  const finalTotal = Math.round(calculatedTotal);

  await patchReceiptInTx(tx, receiptId, {
    date: date ? new Date(date) : undefined,
    storeName: storeName || undefined,
    normalizedStoreName: storeName ? getCleanText(storeName) : undefined,
    totalAmount: finalTotal,
  });

  await deleteItemsByReceiptIdInTx(tx, receiptId);

  if (itemList.length > 0) {
    const classifiedItems = await Promise.all(
      itemList.map(async (item) => {
        const { classification, candidates } = await classifyItemWithSimilarityCandidates(tx, {
          familyGroupId,
          itemName: item.name,
          categoryId: item.categoryId ? Number(item.categoryId) : null,
        });
        return {
          receiptId,
          name: item.name,
          normalizedName: getCleanText(item.name),
          price: parseFloat(String(item.price)) || 0,
          quantity: parseFloat(String(item.quantity)) || 0,
          ...classification,
          productClassificationCandidates: toProductClassificationCandidateInputs(candidates),
        };
      })
    );
    await createItemsInTx(tx, classifiedItems);
  }

  return findReceiptByIdInTx(tx, receiptId);
}

/** 保存済みレシートの完全編集 */
export async function updateReceiptById(
  receiptId: number,
  familyGroupId: number,
  input: UpdateReceiptInput
) {
  return runInTransaction((tx) => applyFullReceiptUpdateInTx(tx, receiptId, familyGroupId, input));
}

async function updateItemCategoryInTxHandler(
  tx: PrismaTx,
  itemId: number,
  familyGroupId: number,
  categoryId: number | null | undefined
) {
  const currentItem = await findItemWithReceiptInTx(tx, itemId);

  if (!currentItem || currentItem.receipt.familyGroupId !== familyGroupId) {
    throw new AppError('ItemNotFound', 404);
  }

  if (categoryId) {
    const category = await findCategoryByIdInTx(tx, Number(categoryId), familyGroupId);
    if (!category) throw new AppError('CategoryNotFound', 404);
  }

  const { classification, candidates } = await classifyItemWithSimilarityCandidates(tx, {
    familyGroupId,
    itemName: currentItem.name,
    categoryId: categoryId ? Number(categoryId) : null,
  });
  const updatedItem = await updateItemCategoryInTx(tx, itemId, classification);
  await replaceProductClassificationCandidatesInTx(
    tx,
    itemId,
    toProductClassificationCandidateInputs(candidates)
  );

  return updatedItem;
}

/** 明細カテゴリ更新 ＋ 学習マスタ反映 */
export async function updateItemCategoryById(
  itemId: number,
  familyGroupId: number,
  categoryId: number | null | undefined
) {
  return runInTransaction((tx) =>
    updateItemCategoryInTxHandler(tx, itemId, familyGroupId, categoryId)
  );
}
