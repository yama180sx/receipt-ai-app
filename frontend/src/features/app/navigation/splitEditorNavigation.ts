import type { ReceiptForSplitEditor } from '../../../types/settlement';

let pendingReceipt: ReceiptForSplitEditor | null = null;

export function setPendingSplitReceipt(receipt: ReceiptForSplitEditor): void {
  pendingReceipt = receipt;
}

export function consumePendingSplitReceipt(receiptId: number): ReceiptForSplitEditor | null {
  if (pendingReceipt?.id !== receiptId) {
    return null;
  }
  const receipt = pendingReceipt;
  pendingReceipt = null;
  return receipt;
}

export function clearPendingSplitReceipt(): void {
  pendingReceipt = null;
}

export function splitEditorPath(receiptId: number): string {
  return `/history/${receiptId}/split`;
}
