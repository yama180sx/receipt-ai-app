import { receiptApi } from '../../../api/receiptApi';
import type { ReceiptDetail } from '../../../types/receipt';
import type { ReceiptForSplitEditor } from '../../../types/settlement';

export function toReceiptForSplitEditor(receipt: ReceiptDetail): ReceiptForSplitEditor | null {
  if (receipt.memberId == null) {
    return null;
  }

  return {
    id: receipt.id,
    memberId: receipt.memberId,
    imagePath: receipt.imagePath,
    storeName: receipt.storeName,
    items: receipt.items ?? [],
  };
}

export async function loadReceiptForSplitEditor(receiptId: number): Promise<ReceiptForSplitEditor | null> {
  const res = await receiptApi.getReceipt(receiptId);
  if (!res.success) {
    return null;
  }

  return toReceiptForSplitEditor(res.data);
}
