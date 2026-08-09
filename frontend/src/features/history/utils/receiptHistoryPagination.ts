import type { ReceiptDetail } from '../../../types/receipt';

export type ReceiptHistoryPage = {
  items: ReceiptDetail[];
  nextCursor: string | null;
  hasNext: boolean;
};

export type ReceiptHistoryPaginationState = ReceiptHistoryPage;

export function replaceReceiptHistoryPage(page: ReceiptHistoryPage): ReceiptHistoryPaginationState {
  return { ...page };
}

export function appendReceiptHistoryPage(
  current: ReceiptHistoryPaginationState,
  page: ReceiptHistoryPage
): ReceiptHistoryPaginationState {
  return {
    items: [...current.items, ...page.items],
    nextCursor: page.nextCursor,
    hasNext: page.hasNext,
  };
}

export function canLoadMore(page: ReceiptHistoryPaginationState): boolean {
  return page.hasNext && page.nextCursor !== null;
}
