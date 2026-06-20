import { geminiReceiptAnalysisProvider } from './geminiReceiptAnalysisProvider';
import type { ReceiptAnalysisProvider } from './receiptAnalysisProvider';

let currentProvider: ReceiptAnalysisProvider = geminiReceiptAnalysisProvider;

export function getReceiptAnalysisProvider(): ReceiptAnalysisProvider {
  return currentProvider;
}

/** テスト等で Provider を差し替える（#91-7 モック方針） */
export function setReceiptAnalysisProvider(provider: ReceiptAnalysisProvider): void {
  currentProvider = provider;
}

export function resetReceiptAnalysisProvider(): void {
  currentProvider = geminiReceiptAnalysisProvider;
}
