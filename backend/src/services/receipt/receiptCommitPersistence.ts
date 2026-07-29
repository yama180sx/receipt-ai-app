import logger from '../../utils/logger';
import { getCleanText } from '../../utils/normalizer';
import type { PrismaTx } from '../../utils/prismaTransaction';
import type { ParsedItem, ReceiptCommitPayload } from '../../types/receipt';
import {
  createReceiptInTx,
  linkApiUsageLogToReceiptInTx,
} from '../../repositories/receiptRepository';
import { classifyItemByExactMatch } from '../productClassification/productClassificationService';

/** commit トランザクション内で永続化するための準備済み入力 */
export type ReceiptCommitTxInput = {
  memberId: number;
  familyGroupId: number;
  parsedData: ReceiptCommitPayload;
  officialStoreName: string;
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
 * 商品完全一致分類 → Receipt 作成 → ApiUsageLog 紐付け
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
      const classification = await classifyItemByExactMatch(tx, {
        familyGroupId,
        itemName: item.name,
        categoryId: item.categoryId ? Number(item.categoryId) : null,
      });

      return {
        name: item.name,
        normalizedName: getCleanText(item.name),
        price: parseFloat(String(item.price || 0)),
        quantity: parseFloat(String(item.quantity || 1)),
        ...classification,
      };
    })
  );

  const created = await createReceiptInTx(tx, {
    memberId,
    familyGroupId,
    storeName: officialStoreName,
    normalizedStoreName: getCleanText(officialStoreName),
    date: jstDate,
    totalAmount,
    taxAmount,
    imagePath,
    rawText: JSON.stringify({ ...parsedData, validation: { isSuspicious, warnings } }),
    items: itemsToCreate,
  });

  if (usageLogId && !isNaN(usageLogId)) {
    await linkApiUsageLogToReceiptInTx(tx, usageLogId, created.id);
    logger.info(`[Link_Log] ApiUsageLog(ID: ${usageLogId}) を Receipt(ID: ${created.id}) に紐付けました。`);
  }

  return created.id;
}
