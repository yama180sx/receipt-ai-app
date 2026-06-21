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
  const res = await receiptApi.listReceipts();
  if (!res.success) {
    return null;
  }

  const receipt = res.data.find((row) => row.id === receiptId);
  return receipt ? toReceiptForSplitEditor(receipt) : null;
}
