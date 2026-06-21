import type { ParsedReceipt } from '../types/receipt';

/** レシート画像解析 Provider（Gemini 等の差し替え点） */
export interface ReceiptAnalysisProvider {
  analyzeReceiptImage(imagePath: string, familyMemberId?: number): Promise<ParsedReceipt>;
}
