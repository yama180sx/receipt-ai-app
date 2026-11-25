import { describe, expect, it } from 'vitest';
import { compareReceiptToExpected, parseExpectedReceipt } from './receiptDiagnosticReport';

describe('receipt diagnostics comparison', () => {
  const actual = { storeName: 'private shop', purchaseDate: '2026-11-26 10:30', totalAmount: 703, taxAmount: 0, items: [{ name: 'private item', price: 1000, quantity: 1 }, { name: 'discount', price: -297, quantity: 1 }] };
  it('reports matching fields without including receipt values', () => {
    const result = compareReceiptToExpected(actual, { ...actual });
    expect(result).toMatchObject({ storeNameMatches: true, totalAmountMatches: true, itemCountMatches: true, itemsMatch: true });
    expect(JSON.stringify(result)).not.toContain('private');
    expect(JSON.stringify(result)).not.toContain('1000');
  });
  it('identifies position and field differences without exposing the values', () => {
    const expected = { ...actual, items: [{ name: 'private item', price: 1200, quantity: 1 }, actual.items[1]] };
    const result = compareReceiptToExpected(actual, expected);
    expect(result.itemsMatch).toBe(false);
    expect(result.itemPositions).toEqual([{ index: 1, present: true, nameMatches: true, priceMatches: false, quantityMatches: true }, { index: 2, present: true, nameMatches: true, priceMatches: true, quantityMatches: true }]);
  });
  it('compares items independent of order while labeling position checks separately', () => {
    const result = compareReceiptToExpected(actual, { items: [...actual.items].reverse() });
    expect(result.itemsMatch).toBe(true);
    expect(result.itemPositions).toHaveLength(2);
  });
  it('rejects malformed expectations without disclosing their contents', () => {
    expect(() => parseExpectedReceipt({ storeName: 3 })).toThrow('Expected receipt format is invalid.');
    expect(() => parseExpectedReceipt({ items: [{ name: 'secret', price: '12', quantity: 1 }] })).toThrow('Expected receipt format is invalid.');
    expect(parseExpectedReceipt({ totalAmount: null })).toEqual({ totalAmount: null });
  });
});
