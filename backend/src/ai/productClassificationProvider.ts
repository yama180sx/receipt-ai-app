import type { ProductClassificationAiRequest } from './productClassificationContract';

/** 商品分類AIの生JSON応答を取得するProviderの差し替え点。 */
export interface ProductClassificationProvider {
  classifyProducts(request: ProductClassificationAiRequest): Promise<string>;
}
