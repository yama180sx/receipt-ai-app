import { prisma } from '../../utils/prismaClient';
import { AppError } from '../../utils/appError';
import { allocateItemSplits, SplitInput } from '../../utils/itemSplitAllocation';
import { calcItemLineTotal } from '../../utils/itemLineTotal';

/** 明細（Item）の負担内訳（ItemSplit）を更新・保存 */
export async function updateItemSplitsById(
  itemId: number,
  familyGroupId: number,
  splits: SplitInput[] | undefined | null
) {
  return prisma.$transaction(async (tx) => {
    const item = await tx.item.findUnique({
      where: { id: itemId },
      include: { receipt: true },
    });

    if (!item || item.receipt.familyGroupId !== familyGroupId) {
      throw new AppError('ItemNotFound', 404);
    }

    if (!splits || !Array.isArray(splits) || splits.length === 0) {
      await tx.itemSplit.deleteMany({ where: { itemId } });
      return { message: 'Splits cleared (Fallback to default payer)' };
    }

    const totalAmount = calcItemLineTotal(item.price, item.quantity);
    const splitInputs: SplitInput[] = splits.map((split) => ({
      familyMemberId: Number(split.familyMemberId),
      ratio: split.ratio,
      amount: split.amount,
    }));

    const memberIds = [...new Set(splitInputs.map((s) => s.familyMemberId))];
    const validMembers = await tx.familyMember.findMany({
      where: { id: { in: memberIds }, familyGroupId },
      select: { id: true },
    });
    if (validMembers.length !== memberIds.length) {
      throw new AppError('Invalid familyMemberId in splits', 403);
    }

    const finalSplits = allocateItemSplits(totalAmount, splitInputs);

    await tx.itemSplit.deleteMany({ where: { itemId } });
    await tx.itemSplit.createMany({
      data: finalSplits.map((fs) => ({
        itemId,
        familyMemberId: fs.familyMemberId,
        amount: fs.amount,
      })),
    });

    return tx.itemSplit.findMany({ where: { itemId } });
  });
}
