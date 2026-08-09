import type { ProductClassificationProvider } from './productClassificationProvider';
import { getProductClassificationProvider } from './productClassificationProviderRegistry';
import {
  parseAndValidateProductClassificationResponse,
  type ProductClassificationAiRequest,
  type ProductClassificationAiResponse,
} from './productClassificationContract';

/**
 * 分類AIの生応答を取得してから契約検証する。
 * 永続化や障害時の継続処理は後続Phaseの責務とする。
 */
export type ProductClassificationAiServiceResult = {
  response: ProductClassificationAiResponse;
  modelId: string;
  usage: { promptTokens: number; candidatesTokens: number; totalTokens: number };
};

export async function classifyProductsWithAi(
  request: ProductClassificationAiRequest,
  provider: ProductClassificationProvider = getProductClassificationProvider()
): Promise<ProductClassificationAiServiceResult> {
  const raw = await provider.classifyProducts(request);
  return { response: parseAndValidateProductClassificationResponse(raw.text, request), modelId: raw.modelId, usage: raw.usage };
}
