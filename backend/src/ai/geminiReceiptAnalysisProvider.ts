import { analyzeReceiptImage } from '../services/geminiService';
import type { ReceiptAnalysisProvider } from './receiptAnalysisProvider';

/** Gemini 実装（既存 geminiService を委譲） */
export const geminiReceiptAnalysisProvider: ReceiptAnalysisProvider = {
  analyzeReceiptImage,
};
