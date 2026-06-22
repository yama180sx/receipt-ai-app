/**
 * レシートドメイン型
 *
 * - DTO: OpenAPI generated の re-export
 * - ViewModel: 手動登録・commit 前編集（OpenAPI 非該当）
 */

/** 手動登録フォーム入力（ViewModel — OpenAPI 非該当） */
export interface ReceiptInput {
  storeName: string;
  date: Date | string;
  totalAmount: number;
  taxAmount: number;
  memberId: number;
  usageLogId?: number;
  items: {
    name: string;
    price: number;
    quantity: number;
    categoryId?: number | null;
  }[];
}

/** OpenAPI DTO（receipt API） */
export type {
  CategorySummary,
  ItemSplitSummary,
  ReceiptItemDetail,
  ReceiptDetail,
} from '../api/generated';

/** commit 前の編集用明細（ViewModel — UI 入力中は string 許容） */
export interface ParsedReceiptItemInput {
  name: string;
  price: number | string;
  quantity: number | string;
  categoryId: number | null;
}

/** commit 前の parsedData（ViewModel — api-spec §5.3 準拠、OpenAPI CommitReceiptRequest とは別） */
export interface ParsedReceiptData {
  storeName: string;
  purchaseDate: string;
  totalAmount: number;
  taxAmount?: number | string;
  items: ParsedReceiptItemInput[];
  usageLogId?: number;
}
