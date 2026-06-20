import logger from '../../utils/logger';
import { getCleanText } from '../../utils/normalizer';
import type { PrismaTx } from '../../utils/prismaTransaction';
import type { ParsedItem, ReceiptCommitPayload } from '../../types/receipt';
import { upsertProductMasterCategory } from './receiptProductMasterLearning';

/** commit トランザクション内で永続化するための準備済み入力 */
export type ReceiptCommitTxInput = {
  memberId: number;
  familyGroupId: number;
  parsedData: ReceiptCommitPayload;
  officialStoreName: string;
  cleanStore: string;
  jstDate: Date;
  totalAmount: number;
  taxAmount: number;
  imagePath: string;
  isSuspicious: boolean;
  warnings: string[];
  usageLogId: number | null;
};

/**
 * レシート commit の DB 書込（tx は呼び出し元が開始）
 * ProductMaster 学習 → Receipt 作成 → ApiUsageLog 紐付け
 */
export async function persistReceiptCommitInTx(
  tx: PrismaTx,
  input: ReceiptCommitTxInput
): Promise<number> {
  const {
    memberId,
    familyGroupId,
    parsedData,
    officialStoreName,
    cleanStore,
    jstDate,
    totalAmount,
    taxAmount,
    imagePath,
    isSuspicious,
    warnings,
    usageLogId,
  } = input;

  const itemsToCreate = await Promise.all(
    parsedData.items.map(async (item: ParsedItem) => {
      const cleanName = getCleanText(item.name);
      const finalCategoryId = item.categoryId ? Number(item.categoryId) : null;

      if (finalCategoryId) {
        await upsertProductMasterCategory(tx, {
          itemName: cleanName,
          storeName: cleanStore,
          familyGroupId,
          categoryId: finalCategoryId,
        });
      }

      return {
        name: item.name,
        price: parseFloat(String(item.price || 0)),
        quantity: parseFloat(String(item.quantity || 1)),
        categoryId: finalCategoryId,
      };
    })
  );

  const created = await tx.receipt.create({
    data: {
      memberId,
      familyGroupId,
      storeName: officialStoreName,
      date: jstDate,
      totalAmount,
      taxAmount,
      imagePath,
      items: { create: itemsToCreate },
      rawText: JSON.stringify({ ...parsedData, validation: { isSuspicious, warnings } }),
    },
    select: { id: true },
  });

  if (usageLogId && !isNaN(usageLogId)) {
    await tx.apiUsageLog.update({
      where: { id: usageLogId },
      data: { receiptId: created.id },
    });
    logger.info(`[Link_Log] ApiUsageLog(ID: ${usageLogId}) を Receipt(ID: ${created.id}) に紐付けました。`);
  }

  return created.id;
}
