const DEFAULT_RECEIPT_MODEL = 'gemini-3.5-flash-lite';
const DEFAULT_PRODUCT_CLASSIFICATION_MODEL = 'gemini-3.5-flash-lite';

function readFixedGeminiModel(variableName: string, defaultValue: string): string {
  const modelId = (process.env[variableName] ?? defaultValue).trim();

  if (!modelId) {
    throw new Error(`${variableName} must be a non-empty Gemini model ID.`);
  }

  // `*-latest` は提供側で参照先が変わる別名であるため、運用品質の比較・ロールバックができない。
  if (/-latest$/i.test(modelId)) {
    throw new Error(`${variableName} must use a fixed Gemini model ID, not a *-latest alias.`);
  }

  return modelId;
}

/** 画像OCR・レシート構造化に使う、起動時に確定したGeminiモデルID。 */
export const GEMINI_RECEIPT_MODEL = readFixedGeminiModel(
  'GEMINI_RECEIPT_MODEL',
  DEFAULT_RECEIPT_MODEL
);

/** 商品分類に使う、起動時に確定したGeminiモデルID。 */
export const GEMINI_PRODUCT_CLASSIFICATION_MODEL = readFixedGeminiModel(
  'GEMINI_PRODUCT_CLASSIFICATION_MODEL',
  DEFAULT_PRODUCT_CLASSIFICATION_MODEL
);

export function getConfiguredReceiptModelId(): string {
  return GEMINI_RECEIPT_MODEL;
}

export function getConfiguredProductClassificationModelId(): string {
  return GEMINI_PRODUCT_CLASSIFICATION_MODEL;
}
