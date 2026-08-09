import {
  deleteReceiptById as deleteReceiptInRepository,
  findReceiptByIdForTenant,
  findLatestReceipt,
  findReceipts,
  listFamilyMembers as listFamilyMembersInRepository,
  type ListReceiptsParams,
} from '../../repositories/receiptRepository';
import { AppError } from '../../utils/appError';
import { encodeReceiptCursor } from '../../utils/receiptPaginationCursor';

export type { ListReceiptsParams };

export async function listReceipts(params: ListReceiptsParams) {
  const receiptsWithExtra = await findReceipts(params);
  const hasNext = receiptsWithExtra.length > params.limit;
  const receipts = receiptsWithExtra.slice(0, params.limit);
  const lastReceipt = hasNext ? receipts.at(-1) : undefined;

  return {
    receipts,
    hasNext,
    nextCursor: lastReceipt
      ? encodeReceiptCursor({ date: lastReceipt.date, id: lastReceipt.id }, params)
      : null,
  };
}

export async function getReceiptById(receiptId: number, familyGroupId: number) {
  const receipt = await findReceiptByIdForTenant(receiptId, familyGroupId);
  if (!receipt) throw new AppError('ReceiptNotFound', 404);
  return receipt;
}

export async function getLatestReceipt(familyGroupId: number) {
  return findLatestReceipt(familyGroupId);
}

export async function deleteReceiptById(receiptId: number, familyGroupId: number) {
  return deleteReceiptInRepository(receiptId, familyGroupId);
}

export async function listFamilyMembers(familyGroupId: number) {
  return listFamilyMembersInRepository(familyGroupId);
}
