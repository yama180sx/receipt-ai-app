import { AppError } from '../../utils/appError';
import { runInTransaction, type PrismaTx } from '../../utils/prismaTransaction';
import { calcItemLineTotal } from '../../utils/itemLineTotal';
import {
  createItemSplitsInTx,
  deleteItemSplitsInTx,
  findFamilyMembersByIdsInTx,
  findItemSplitsInTx,
  findItemWithReceiptInTx,
} from '../../repositories/receiptRepository';
import { allocateItemSplits, type SplitInput } from './itemSplitAllocation';

async function updateItemSplitsInTx(
  tx: PrismaTx,
  itemId: number,
  familyGroupId: number,
  splits: SplitInput[] | undefined | null
) {
  const item = await findItemWithReceiptInTx(tx, itemId);

  if (!item || item.receipt.familyGroupId !== familyGroupId) {
    throw new AppError('ItemNotFound', 404);
  }

  if (!splits || !Array.isArray(splits) || splits.length === 0) {
    await deleteItemSplitsInTx(tx, itemId);
    return { message: 'Splits cleared (Fallback to default payer)' };
  }

  const totalAmount = calcItemLineTotal(item.price, item.quantity);
  const splitInputs: SplitInput[] = splits.map((split) => ({
    familyMemberId: Number(split.familyMemberId),
    ratio: split.ratio,
    amount: split.amount,
  }));

  const memberIds = [...new Set(splitInputs.map((s) => s.familyMemberId))];
  const validMembers = await findFamilyMembersByIdsInTx(tx, memberIds, familyGroupId);
  if (validMembers.length !== memberIds.length) {
    throw new AppError('Invalid familyMemberId in splits', 403);
  }

  const finalSplits = allocateItemSplits(totalAmount, splitInputs);

  await deleteItemSplitsInTx(tx, itemId);
  await createItemSplitsInTx(
    tx,
    finalSplits.map((fs) => ({
      itemId,
      familyMemberId: fs.familyMemberId,
      amount: fs.amount,
    }))
  );

  return findItemSplitsInTx(tx, itemId);
}

/** 明細（Item）の負担内訳（ItemSplit）を更新・保存 */
export async function updateItemSplitsById(
  itemId: number,
  familyGroupId: number,
  splits: SplitInput[] | undefined | null
) {
  return runInTransaction((tx) => updateItemSplitsInTx(tx, itemId, familyGroupId, splits));
}

export type { SplitInput } from './itemSplitAllocation';
