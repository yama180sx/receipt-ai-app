import type { ProductClassificationAiRequest } from './productClassificationContract';

export type ProductClassificationProviderResult = {
  text: string;
  modelId: string;
  usage: { promptTokens: number; candidatesTokens: number; totalTokens: number };
};

/** 商品分類AIの生JSON応答を取得するProviderの差し替え点。 */
export interface ProductClassificationProvider {
  classifyProducts(request: ProductClassificationAiRequest): Promise<ProductClassificationProviderResult>;
}
