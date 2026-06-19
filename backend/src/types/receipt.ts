/**
 * レシートドメイン型（Issue #98-2）
 * Gemini 解析出力・commit/save 経路の共通型。api-spec §5.3 と整合。
 */

/** Gemini 解析出力の明細 */
export interface ParsedItem {
  name: string;
  price: number;
  quantity: number;
  inferredCategory?: string;
  /** analyzeOnly 後に付与 */
  categoryId?: number | null;
  /** validationService 用（Gemini 生出力の category キー） */
  category?: string;
  /** 行合計（OCR 由来、任意） */
  amount?: number;
}

/** Gemini 解析出力 */
export interface ParsedReceipt {
  storeName: string;
  purchaseDate: string;
  totalAmount: number;
  taxAmount?: number;
  items: ParsedItem[];
  usageLogId?: number;
  /** 手動登録ルートの legacy alias（purchaseDate と同義） */
  date?: string;
}

/** commit / saveParsedReceipt 入力 */
export type ReceiptCommitPayload = ParsedReceipt;

/** 重複チェック read-only 判定用（部分データを許容） */
export type ReceiptDuplicateCheckInput = {
  storeName?: string | null;
  purchaseDate?: string | null;
  date?: string | null;
  totalAmount?: number | null;
};

/** POST /receipts 手動登録の明細入力 */
export interface ReceiptCreateItemInput {
  name: string;
  price: number | string;
  quantity?: number | string;
  categoryId?: number | null;
}
