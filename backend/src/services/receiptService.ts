/**
 * 後方互換ファサード（Issue #98-3）
 * 新規コードは `services/receipt/*` を直接 import してください。
 */
import { prisma } from '../utils/prismaClient';
import { analyzeOnly } from './receipt/receiptAnalysisService';
import { saveConfirmedReceipt } from './receipt/receiptPersistenceService';

export { analyzeOnly } from './receipt/receiptAnalysisService';
export { saveParsedReceipt, saveConfirmedReceipt } from './receipt/receiptPersistenceService';
export { DuplicateReceiptError, isDuplicateReceiptError, getDuplicateExistingId } from './receipt/receiptDuplicateError';

/** 解析〜保存の一括処理（Worker 用レガシー / スクリプト用） */
export const processAndSaveReceipt = async (memberId: number, imagePath: string) => {
  const member = await prisma.familyMember.findUnique({
    where: { id: memberId },
    select: { familyGroupId: true },
  });
  if (!member) throw new Error('MEMBER_NOT_FOUND');

  const { parsedData, validation } = await analyzeOnly(memberId, imagePath);
  return saveConfirmedReceipt(
    memberId,
    member.familyGroupId,
    parsedData,
    imagePath,
    validation.isSuspicious,
    validation.warnings
  );
};
