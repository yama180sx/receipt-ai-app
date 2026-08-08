import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../api/receiptApi', () => ({
  receiptApi: {
    getReceipt: vi.fn(),
  },
}));

import { receiptApi } from '../../../api/receiptApi';
import { loadReceiptForSplitEditor, toReceiptForSplitEditor } from './receiptForSplitEditor';

const receipt = {
  id: 42,
  memberId: 1,
  imagePath: 'uploads/receipt.webp',
  storeName: '店舗',
  totalAmount: 100,
  items: [],
};

describe('receiptForSplitEditor', () => {
  it('creates split editor data from a receipt detail', () => {
    expect(toReceiptForSplitEditor(receipt)).toEqual({
      id: 42,
      memberId: 1,
      imagePath: 'uploads/receipt.webp',
      storeName: '店舗',
      items: [],
    });
  });

  it('loads only the requested receipt', async () => {
    vi.mocked(receiptApi.getReceipt).mockResolvedValue({ success: true, data: receipt });

    await expect(loadReceiptForSplitEditor(42)).resolves.toMatchObject({ id: 42 });
    expect(receiptApi.getReceipt).toHaveBeenCalledWith(42);
  });
});
