import { geminiProductClassificationProvider } from './geminiProductClassificationProvider';
import type { ProductClassificationProvider } from './productClassificationProvider';

let currentProvider: ProductClassificationProvider = geminiProductClassificationProvider;

export function getProductClassificationProvider(): ProductClassificationProvider {
  return currentProvider;
}

/** テスト等でProviderを差し替える。 */
export function setProductClassificationProvider(provider: ProductClassificationProvider): void {
  currentProvider = provider;
}

export function resetProductClassificationProvider(): void {
  currentProvider = geminiProductClassificationProvider;
}
