import { describe, expect, it, vi } from 'vitest';

vi.mock('../utils/normalizer', () => ({ getCleanText: (value: string) => value.toLowerCase(), normalizeStoreName: async (value: string) => value, normalizeStoreNames: async (values: string[]) => values.map((value) => value === 'ダイソー' ? 'DAISO' : value) }));
vi.mock('../repositories/receiptRepository', () => ({ findReceiptForDuplicate: vi.fn(), findDuplicateReceiptCandidates: vi.fn().mockResolvedValue([]) }));

import { comparableStoreName, findDuplicateCandidates, parseReceiptDate, unreviewedDuplicateId } from './duplicateReceiptService';
import { findDuplicateReceiptCandidates } from '../repositories/receiptRepository';

describe('receipt date parsing', () => {
  it('rejects missing, invalid and impossible dates instead of using today', () => {
    for (const value of [undefined, '', 'not a date', '2026-02-30', '2026-01-01 25:00']) {
      expect(parseReceiptDate(value)).toBeNull();
    }
  });

  it('accepts a calendar date with or without a time', () => {
    expect(parseReceiptDate('2026-11-23 17:27')?.getHours()).toBe(17);
    expect(parseReceiptDate('2026-11-23')?.getDate()).toBe(23);
  });
});

it('requires a new confirmation when a candidate appears after review', () => {
  expect(unreviewedDuplicateId([{ id: 1 }, { id: 2 }], [1])).toBe(2);
  expect(unreviewedDuplicateId([{ id: 1 }], [1, 2])).toBeNull();
});

it('equates DAISO and ダイソー while preserving the branch name', () => {
  expect(comparableStoreName('DAISO イオン店')).toBe(comparableStoreName('ダイソー イオン店'));
  expect(comparableStoreName('DAISO 別店')).not.toBe(comparableStoreName('ダイソー イオン店'));
});

it('searches within the same household and amount, including midnight as a precise time', async () => {
  await findDuplicateCandidates(3, { storeName: '店', purchaseDate: '2026-11-23 00:00', totalAmount: 1430 });
  const query = vi.mocked(findDuplicateReceiptCandidates).mock.calls[0][0];
  expect(query).toMatchObject({ familyGroupId: 3, totalAmount: 1430 });
  const range = query.date as { gte: Date; lte: Date };
  expect(range.lte.getTime() - range.gte.getTime()).toBe(120000);
});

it('returns only matching store names after aliases are resolved', async () => {
  vi.mocked(findDuplicateReceiptCandidates).mockResolvedValueOnce([
    { id: 1, storeName: 'DAISO', date: new Date(), totalAmount: 1430, imagePath: null },
    { id: 2, storeName: '別店舗', date: new Date(), totalAmount: 1430, imagePath: null },
  ]);
  const result = await findDuplicateCandidates(3, { storeName: 'ダイソー', purchaseDate: '2026-11-23 17:27', totalAmount: 1430 });
  expect(result.map((item) => item.id)).toEqual([1]);
});

it('does not search if essential data is missing', async () => {
  vi.mocked(findDuplicateReceiptCandidates).mockClear();
  expect(await findDuplicateCandidates(3, { storeName: '', purchaseDate: '2026-11-23', totalAmount: 1430 })).toEqual([]);
  expect(await findDuplicateCandidates(3, { storeName: '店', purchaseDate: '', totalAmount: 1430 })).toEqual([]);
  expect(await findDuplicateCandidates(3, { storeName: '店', purchaseDate: '2026-11-23' })).toEqual([]);
  expect(findDuplicateReceiptCandidates).not.toHaveBeenCalled();
});
