import { describe, expect, it } from 'vitest';
import {
  appendReceiptHistoryPage,
  canLoadMore,
  replaceReceiptHistoryPage,
} from './receiptHistoryPagination';

const receipt = (id: number) => ({ id, storeName: `店舗${id}`, totalAmount: id, items: [] });

describe('receiptHistoryPagination', () => {
  it('replaces the current page when filters change', () => {
    const page = replaceReceiptHistoryPage({
      items: [receipt(1)],
      nextCursor: 'next',
      hasNext: true,
    });

    expect(page).toEqual({ items: [receipt(1)], nextCursor: 'next', hasNext: true });
  });

  it('appends a following page and updates its cursor state', () => {
    const current = { items: [receipt(2)], nextCursor: 'cursor-1', hasNext: true };
    const page = appendReceiptHistoryPage(current, {
      items: [receipt(1)],
      nextCursor: null,
      hasNext: false,
    });

    expect(page).toEqual({ items: [receipt(2), receipt(1)], nextCursor: null, hasNext: false });
    expect(canLoadMore(page)).toBe(false);
  });

  it('allows loading more only when both cursor and hasNext are present', () => {
    expect(canLoadMore({ items: [], nextCursor: 'cursor', hasNext: true })).toBe(true);
    expect(canLoadMore({ items: [], nextCursor: null, hasNext: true })).toBe(false);
  });
});
