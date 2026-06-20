import { prisma } from '../../utils/prismaClient';
import logger from '../../utils/logger';
import { normalizeStoreName, getCleanText } from '../../utils/normalizer';
import { runReceiptCommitTransaction } from '../../utils/prismaTransaction';
import { checkDuplicateReceipt, parseReceiptDate } from '../duplicateReceiptService';
import type { ReceiptCommitPayload } from '../../types/receipt';
import { DuplicateReceiptError } from './receiptDuplicateError';
import { persistReceiptCommitInTx } from './receiptCommitPersistence';

/**
 * パース済みデータを DB に永続化（重複チェック ＋ 世帯別学習）
 * [Issue #63 / #72] ApiUsageLog 紐付けをトランザクション内で実行
 * [Issue #98-4] commit 系 tx は runReceiptCommitTransaction のみで開始
 */
export async function saveParsedReceipt(
  memberId: number,
  familyGroupId: number,
  parsedData: ReceiptCommitPayload,
  imagePath: string,
  isSuspicious: boolean,
  warnings: string[]
) {
  const officialStoreName = await normalizeStoreName(parsedData.storeName || '');
  const cleanStore = getCleanText(officialStoreName);
  const jstDate = parseReceiptDate(parsedData.purchaseDate || parsedData.date);

  const totalAmount = Math.round(Number(parsedData.totalAmount || 0));
  const taxAmount = parsedData.taxAmount ? parseFloat(String(parsedData.taxAmount)) : 0;

  const usageLogIdStr = parsedData.usageLogId !== undefined ? String(parsedData.usageLogId) : null;
  const usageLogId = usageLogIdStr ? parseInt(usageLogIdStr, 10) : null;

  if (imagePath) {
    const existingByImage = await prisma.receipt.findFirst({
      where: { familyGroupId, imagePath },
      include: { items: { include: { category: true } } },
    });
    if (existingByImage) {
      logger.info(`[Idempotent] imagePath 一致のため既存レシートを返却: ID ${existingByImage.id}`);
      return {
        ...JSON.parse(JSON.stringify(existingByImage)),
        isSuspicious,
        warnings,
      };
    }
  }

  const duplicate = await checkDuplicateReceipt(familyGroupId, parsedData, imagePath);
  if (duplicate.duplicateSuspected) {
    throw new DuplicateReceiptError(duplicate.existingReceiptId);
  }

  const savedId = await runReceiptCommitTransaction((tx) =>
    persistReceiptCommitInTx(tx, {
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
    })
  );

  const final = await prisma.receipt.findUnique({
    where: { id: savedId },
    include: { items: { include: { category: true } } },
  });

  return { ...JSON.parse(JSON.stringify(final)), isSuspicious, warnings };
}

/** ユーザー確認済みデータの永続化 */
export async function saveConfirmedReceipt(
  memberId: number,
  familyGroupId: number,
  parsedData: ReceiptCommitPayload,
  imagePath: string,
  isSuspicious: boolean,
  warnings: string[]
) {
  return saveParsedReceipt(memberId, familyGroupId, parsedData, imagePath, isSuspicious, warnings);
}
