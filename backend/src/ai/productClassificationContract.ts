import { z } from 'zod';

export const PRODUCT_CLASSIFICATION_PROMPT_KEY = 'PRODUCT_CLASSIFICATION';

export type ProductClassificationCandidateInput = {
  productTypeId: number;
  name: string;
  standardCategoryName: string;
};

export type ProductClassificationAiItemInput = {
  itemId: number;
  itemName: string;
  normalizedName: string;
  candidates: ProductClassificationCandidateInput[];
};

export type ProductClassificationAiRequest = {
  familyGroupId: number;
  storeName?: string;
  items: ProductClassificationAiItemInput[];
};

export type ProductClassificationAiItemResult = {
  itemId: number;
  productTypeId: number | null;
  confidence: 'high' | 'medium' | 'low';
};

export type ProductClassificationAiResponse = {
  items: ProductClassificationAiItemResult[];
};

export class ProductClassificationResponseValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProductClassificationResponseValidationError';
  }
}

const productClassificationResponseSchema = z.object({
  items: z.array(
    z.object({
      itemId: z.number().int().positive(),
      productTypeId: z.number().int().positive().nullable(),
      confidence: z.enum(['high', 'medium', 'low']),
    }).strict()
  ),
}).strict();

/**
 * AIのJSON文字列を契約・候補制約に照らして検証する。
 * 1件でも不正なら部分採用せず、呼び出し結果全体を無効とする。
 */
export function parseAndValidateProductClassificationResponse(
  rawText: string,
  request: ProductClassificationAiRequest
): ProductClassificationAiResponse {
  let raw: unknown;
  try {
    raw = JSON.parse(rawText);
  } catch {
    throw new ProductClassificationResponseValidationError('分類AIの応答がJSONではありません。');
  }

  const parsed = productClassificationResponseSchema.safeParse(raw);
  if (!parsed.success) {
    throw new ProductClassificationResponseValidationError('分類AIの応答形式が不正です。');
  }

  const requestedItems = new Map(request.items.map((item) => [item.itemId, item]));
  const returnedItemIds = new Set<number>();

  for (const result of parsed.data.items) {
    const requestedItem = requestedItems.get(result.itemId);
    if (!requestedItem) {
      throw new ProductClassificationResponseValidationError('要求していない明細IDが含まれています。');
    }
    if (returnedItemIds.has(result.itemId)) {
      throw new ProductClassificationResponseValidationError('明細IDが重複しています。');
    }
    returnedItemIds.add(result.itemId);

    if (
      result.productTypeId !== null &&
      !requestedItem.candidates.some((candidate) => candidate.productTypeId === result.productTypeId)
    ) {
      throw new ProductClassificationResponseValidationError('候補外の商品種別IDが含まれています。');
    }
  }

  return parsed.data;
}
