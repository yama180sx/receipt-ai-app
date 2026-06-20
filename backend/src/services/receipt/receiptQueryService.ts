import {
  deleteReceiptById as deleteReceiptInRepository,
  findLatestReceipt,
  findReceipts,
  listFamilyMembers as listFamilyMembersInRepository,
  type ListReceiptsParams,
} from '../../repositories/receiptRepository';

export type { ListReceiptsParams };

export async function listReceipts(params: ListReceiptsParams) {
  return findReceipts(params);
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
