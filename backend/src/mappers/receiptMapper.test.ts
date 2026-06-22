import { describe, expect, it } from 'vitest';
import {
  mapCategoriesToSummary,
  mapFamilyMembersToSummary,
  mapItemSplitToSummary,
  mapReceiptItemToDetail,
  mapReceiptList,
  mapReceiptToDetail,
  mapUploadJobResponse,
} from './receiptMapper';

describe('receiptMapper', () => {
  const category = {
    id: 1,
    name: '食費',
    familyGroupId: 1,
    color: '#ff0000',
    keywords: [],
  };

  const receipt = {
    id: 10,
    familyGroupId: 1,
    memberId: 2,
    storeName: 'テスト店',
    date: new Date('2026-01-15T03:00:00.000Z'),
    totalAmount: 1200,
    taxAmount: 100,
    rawText: null,
    imagePath: 'uploads/test.webp',
    createdAt: new Date('2026-01-15T04:00:00.000Z'),
    items: [
      {
        id: 100,
        receiptId: 10,
        categoryId: 1,
        name: 'りんご',
        price: 120,
        quantity: 10,
        category,
        splits: [
          {
            id: 1,
            itemId: 100,
            familyMemberId: 2,
            amount: 600,
            createdAt: new Date('2026-01-15T04:00:00.000Z'),
          },
        ],
      },
    ],
  };

  it('maps receipt with nested items, category, and splits to ReceiptDetail', () => {
    const detail = mapReceiptToDetail(receipt);

    expect(detail).toEqual({
      id: 10,
      storeName: 'テスト店',
      date: '2026-01-15T03:00:00.000Z',
      totalAmount: 1200,
      taxAmount: 100,
      imagePath: 'uploads/test.webp',
      memberId: 2,
      familyGroupId: 1,
      items: [
        {
          id: 100,
          name: 'りんご',
          price: 120,
          quantity: 10,
          categoryId: 1,
          category: { id: 1, name: '食費', color: '#ff0000' },
          splits: [{ id: 1, itemId: 100, familyMemberId: 2, amount: 600 }],
        },
      ],
    });
  });

  it('returns null for missing receipt', () => {
    expect(mapReceiptToDetail(null)).toBeNull();
    expect(mapReceiptToDetail(undefined)).toBeNull();
  });

  it('maps receipt list', () => {
    const list = mapReceiptList([receipt]);
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(10);
  });

  it('maps item without splits', () => {
    const item = {
      id: 101,
      receiptId: 10,
      categoryId: null,
      name: '牛乳',
      price: 200,
      quantity: 1,
      category: null,
    };

    expect(mapReceiptItemToDetail(item)).toEqual({
      id: 101,
      name: '牛乳',
      price: 200,
      quantity: 1,
      categoryId: null,
      category: null,
      splits: undefined,
    });
  });

  it('maps categories to CategorySummary without internal fields', () => {
    expect(mapCategoriesToSummary([category])).toEqual([
      { id: 1, name: '食費', color: '#ff0000' },
    ]);
  });

  it('maps family members and item splits', () => {
    expect(mapFamilyMembersToSummary([{ id: 3, name: '太郎' }])).toEqual([
      { id: 3, name: '太郎' },
    ]);

    expect(
      mapItemSplitToSummary({
        id: 5,
        itemId: 100,
        familyMemberId: 3,
        amount: 300,
        createdAt: new Date(),
      })
    ).toEqual({
      id: 5,
      itemId: 100,
      familyMemberId: 3,
      amount: 300,
    });
  });

  it('maps upload job response', () => {
    expect(mapUploadJobResponse('job-1')).toEqual({ jobId: 'job-1' });
  });
});
