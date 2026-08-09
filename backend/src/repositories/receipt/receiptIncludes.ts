import { Prisma } from '@prisma/client';

/** Receipt include 形状の SSOT */
export const receiptWithItemsCategorySplits = {
  items: { include: { category: true, productType: true, splits: true } },
} satisfies Prisma.ReceiptInclude;

export const receiptWithItemsCategory = {
  items: { include: { category: true, productType: true } },
} satisfies Prisma.ReceiptInclude;
