/**
 * [Issue #67] レシート入力用インターフェース
 * - price, quantity は小数を許容。
 * - totalAmount は JPY の整合性のため整数を想定。
 */
export interface ReceiptInput {
  storeName: string;
  date: Date | string;    // API通信を考慮し string も許容
  totalAmount: number;    // 四捨五入済みの整数値
  memberId: number;       // 既存ロジック (receiptRoutes/Controller) との名称統合
  items: {
    name: string;
    price: number;        // 小数許容 (ガソリン単価 165.8 等)
    quantity: number;     // 小数許容 (0.5個、1.25L 等)
    categoryId?: number | null;
  }[];
}