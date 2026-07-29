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
export async function classifyProductsWithAi(
  request: ProductClassificationAiRequest,
  provider: ProductClassificationProvider = getProductClassificationProvider()
): Promise<ProductClassificationAiResponse> {
  const rawText = await provider.classifyProducts(request);
  return parseAndValidateProductClassificationResponse(rawText, request);
}
