import { describe, expect, it } from 'vitest';
import { allocateAdjustmentsToCategories } from './adjustmentCategoryAllocation';

const food = { id: 1, name: '食費', color: '#f00', isAdjustment: false };
const daily = { id: 2, name: '日用品', color: '#00f', isAdjustment: false };
const adjustment = { id: 10, name: '値引き等', color: '#666', isAdjustment: true };

describe('allocateAdjustmentsToCategories', () => {
  it('allocates a negative adjustment within its receipt and assigns the residual yen to the largest category', () => {
    expect(allocateAdjustmentsToCategories([
      { receiptId: 1, price: 700, quantity: 1, category: food },
      { receiptId: 1, price: 300, quantity: 1, category: daily },
      { receiptId: 1, price: -101, quantity: 1, category: adjustment },
    ])).toEqual([
      { categoryId: 1, categoryName: '食費', color: '#f00', totalAmount: 629 },
      { categoryId: 2, categoryName: '日用品', color: '#00f', totalAmount: 270 },
    ]);
  });

  it('uses category id as the deterministic tie breaker for a residual yen', () => {
    expect(allocateAdjustmentsToCategories([
      { receiptId: 1, price: 100, quantity: 1, category: food },
      { receiptId: 1, price: 100, quantity: 1, category: daily },
      { receiptId: 1, price: -1, quantity: 1, category: adjustment },
    ])).toEqual([
      { categoryId: 2, categoryName: '日用品', color: '#00f', totalAmount: 100 },
      { categoryId: 1, categoryName: '食費', color: '#f00', totalAmount: 99 },
    ]);
  });

  it('leaves an adjustment in its own category when no positive normal category exists', () => {
    expect(allocateAdjustmentsToCategories([
      { receiptId: 1, price: -100, quantity: 1, category: adjustment },
    ])).toEqual([
      { categoryId: 10, categoryName: '値引き等', color: '#666', totalAmount: -100 },
    ]);
  });

  it('does not allocate an adjustment across receipts', () => {
    expect(allocateAdjustmentsToCategories([
      { receiptId: 1, price: 100, quantity: 1, category: food },
      { receiptId: 1, price: -20, quantity: 1, category: adjustment },
      { receiptId: 2, price: 100, quantity: 1, category: daily },
    ])).toEqual([
      { categoryId: 2, categoryName: '日用品', color: '#00f', totalAmount: 100 },
      { categoryId: 1, categoryName: '食費', color: '#f00', totalAmount: 80 },
    ]);
  });
});
