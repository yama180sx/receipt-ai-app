/**
 * [Issue #67 / #71 / #63] レシート入力用インターフェース
 * - price, quantity, taxAmount は小数を許容。
 * - totalAmount は JPY の整合性のため整数を想定。
 */
export interface ReceiptInput {
  storeName: string;
  date: Date | string;    // API通信を考慮し string も許容
  totalAmount: number;    // 最終支払額（四捨五入済みの整数値）
  
  /**
   * [Issue #71] 外付けの消費税額
   * 小計後に加算される税額を保持。内税のみの場合は 0 を想定。
   */
  taxAmount: number;      
  
  memberId: number;       // 既存ロジック (receiptRoutes/Controller) との名称統合
  
  /**
   * [Issue #63] Gemini API トークンログID
   * AI解析経由での保存時に、コストトレーサビリティを確保するため保持。手動登録時は undefined。
   */
  usageLogId?: number;    

  items: {
    name: string;
    price: number;        // 小数許容 (ガソリン単価 165.8 等)
    quantity: number;     // 小数許容 (0.5個、1.25L 等)
    categoryId?: number | null;
  }[];
}