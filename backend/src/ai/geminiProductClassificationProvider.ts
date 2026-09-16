import { GoogleGenerativeAI } from '@google/generative-ai';
import { findActivePromptTemplateByKeyForFamilyGroup } from '../repositories/promptRepository';
import type { ProductClassificationProvider } from './productClassificationProvider';
import {
  PRODUCT_CLASSIFICATION_PROMPT_KEY,
  type ProductClassificationAiRequest,
} from './productClassificationContract';
import { getConfiguredProductClassificationModelId as getConfiguredModelId } from '../config/geminiModel';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? '');
const GEMINI_MODEL = getConfiguredModelId();

/** 失敗監査にも利用する、分類AIの設定済みモデル名。 */
export function getConfiguredProductClassificationModelId(): string {
  return GEMINI_MODEL;
}

function buildClassificationPrompt(systemPrompt: string, request: ProductClassificationAiRequest): string {
  return `${systemPrompt}\n\n### 分類対象 (JSON)\n${JSON.stringify({
    storeName: request.storeName,
    items: request.items,
  })}\n\n出力は次のJSONオブジェクトだけにしてください。\n{"items":[{"itemId":123,"productTypeId":11,"confidence":"high"}]}`;
}

/** Geminiによる分類専用実装。画像OCRは扱わず、テキストと候補だけを送る。 */
export const geminiProductClassificationProvider: ProductClassificationProvider = {
  async classifyProducts(request) {
    const template = await findActivePromptTemplateByKeyForFamilyGroup(
      request.familyGroupId,
      PRODUCT_CLASSIFICATION_PROMPT_KEY
    );
    if (!template) {
      throw new Error('分類AI用プロンプトテンプレート(PRODUCT_CLASSIFICATION)が見つかりません。');
    }

    const model = genAI.getGenerativeModel({
      model: GEMINI_MODEL,
      generationConfig: { responseMimeType: 'application/json' },
    });
    const result = await model.generateContent(buildClassificationPrompt(template.systemPrompt, request));
    const response = await result.response;
    return {
      text: response.text(),
      modelId: GEMINI_MODEL,
      usage: {
        promptTokens: response.usageMetadata?.promptTokenCount ?? 0,
        candidatesTokens: response.usageMetadata?.candidatesTokenCount ?? 0,
        totalTokens: response.usageMetadata?.totalTokenCount ?? 0,
      },
    };
  },
};
