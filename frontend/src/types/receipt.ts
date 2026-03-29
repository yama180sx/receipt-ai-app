// src/types/receipt.ts
export interface ReceiptInput {
  storeName: string;
  transactionDate: Date;
  totalAmount: number;
  familyMemberId: number; // 誰の支出か
  items: {
    name: string;
    price: number;
    quantity: number;
    categoryId?: number; // 分類（任意）
  }[];
}