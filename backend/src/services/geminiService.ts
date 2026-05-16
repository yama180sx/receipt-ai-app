import { GoogleGenerativeAI } from "@google/generative-ai";
import * as fs from "fs";
import * as path from "path";
import prisma from "../utils/prismaClient"; 
import logger from "../utils/logger";

export interface ParsedItem {
  name: string;
  price: number;
  quantity: number;
  inferredCategory?: string; 
}

export interface ParsedReceipt {
  storeName: string;
  purchaseDate: string; 
  totalAmount: number;
  taxAmount?: number;
  items: ParsedItem[];
  usageLogId?: number; // [Issue #63] ログ紐付け用に追加
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";
const RETRY_COUNT = parseInt(process.env.GEMINI_RETRY_COUNT || "3", 10);
const RETRY_DELAY = parseInt(process.env.GEMINI_RETRY_DELAY || "2000", 10);

const getMimeType = (filePath: string): string => {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".png": return "image/png";
    case ".webp": return "image/webp";
    case ".heic": return "image/heic";
    default: return "image/jpeg";
  }
};

/**
 * 汎用リトライラッパー (API制限やネットワークエラー用)
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  retries: number = RETRY_COUNT,
  delay: number = RETRY_DELAY 
): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const status = error?.status || error?.response?.status;
    const isRetryable = status === 429 || status >= 500;
    if (retries <= 0 || !isRetryable) throw error;
    
    logger.warn(`⚠️ Gemini APIリトライ中... 残り ${retries} 回 (Error: ${status})`);
    await new Promise(resolve => setTimeout(resolve, delay));
    return withRetry(fn, retries - 1, delay * 2);
  }
}

/**
 * [Issue #72] プロンプトをDBから取得し、ドメインヒントを結合
 */
async function buildPrompt(): Promise<string> {
  const template = await prisma.promptTemplate.findUnique({
    where: { key: "RECEIPT_ANALYSIS", isActive: true }
  });

  if (!template) {
    throw new Error("プロンプトテンプレート(RECEIPT_ANALYSIS)がDBに見つかりません。");
  }

  let prompt = template.systemPrompt;

  if (template.domainHints) {
    const hints = template.domainHints as Record<string, string>;
    const hintText = Object.entries(hints)
      .map(([key, val]) => `- ${key}: ${val}`)
      .join("\n");
    prompt += `\n\n### 業態別特別指示:\n${hintText}`;
  }

  return prompt;
}

/**
 * 抽出データの算術整合性チェック
 */
function validateArithmetic(data: ParsedReceipt): { isValid: boolean; diff: number } {
  const itemsTotal = data.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const calculatedTotal = itemsTotal + (data.taxAmount || 0);
  const diff = Math.abs(calculatedTotal - data.totalAmount);
  
  return { isValid: diff <= 1, diff };
}

/**
 * [Issue #72] レシート画像を解析
 * - DBからの動的プロンプト取得
 * - 算術不整合時の自己修復リトライ
 * - [Issue #63] usageLogId の返却（自己修復時の累積トークン合算に対応）
 */
export const analyzeReceiptImage = async (
  imagePath: string, 
  familyMemberId?: number
): Promise<ParsedReceipt> => {

  const processAnalysis = async (
    retryWithCorrection: boolean = false, 
    previousErrorData?: string,
    existingLogId?: number // ★修正: リトライ用に初回に採番されたログIDを引き回す
  ): Promise<ParsedReceipt> => {
    const model = genAI.getGenerativeModel({ 
      model: GEMINI_MODEL, 
      generationConfig: { responseMimeType: "application/json" }
    });

    let prompt = await buildPrompt();

    if (retryWithCorrection && previousErrorData) {
      prompt += `\n\n⚠️ 前回の解析結果で算術矛盾が発生しました: ${previousErrorData}\n「(各品目の price * quantity の合計) + taxAmount = totalAmount」が厳密に一致するように数値を再精査してください。特に数量が小数（ガソリン等）の場合は注意してください。`;
    }

    if (!fs.existsSync(imagePath)) throw new Error(`File not found: ${imagePath}`);

    const imageData = {
      inlineData: {
        data: fs.readFileSync(imagePath).toString("base64"),
        mimeType: getMimeType(imagePath),
      },
    };

    const result = await model.generateContent([prompt, imageData]);
    const response = await result.response;
    
    // トークンログ記録
    let usageLogId: number | undefined = existingLogId;
    const usage = response.usageMetadata;
    if (usage) {
      try {
        if (existingLogId) {
          // ★修正[Issue #63]: 自己修復リトライ時は、既存のログレコードにトークン使用量を合算（累積）
          await prisma.apiUsageLog.update({
            where: { id: existingLogId },
            data: {
              promptTokens: { increment: usage.promptTokenCount },
              candidatesTokens: { increment: usage.candidatesTokenCount },
              totalTokens: { increment: usage.totalTokenCount },
            }
          });
          logger.info(`[Gemini_Log] 自己修復リトライ分のトークンを合算しました (LogID: ${existingLogId})`);
        } else {
          // 初回解析時は新規ログレコードを作成
          const log = await prisma.apiUsageLog.create({
            data: {
              familyMemberId: familyMemberId || null,
              modelId: GEMINI_MODEL,
              promptTokens: usage.promptTokenCount,
              candidatesTokens: usage.candidatesTokenCount,
              totalTokens: usage.totalTokenCount,
            }
          });
          usageLogId = log.id;
        }
      } catch (e) {
        logger.error("❌ ApiUsageLog の保存・更新に失敗しました:", e);
      }
    }

    const text = response.text();
    let data: ParsedReceipt;
    
    try {
      data = JSON.parse(text) as ParsedReceipt;
    } catch (e) {
      logger.error(`[JSON Parse Error] Raw: ${text}`);
      throw new Error("Geminiのレスポンスが正しいJSON形式ではありません。");
    }

    // usageLogId をデータに付与
    data.usageLogId = usageLogId;

    // 算術整合性チェック
    const { isValid, diff } = validateArithmetic(data);
    if (!isValid && !retryWithCorrection) {
      logger.warn(`[Issue #72] 算術不整合(差分:${diff}円)。自己修復リトライを開始します。`);
      return await processAnalysis(true, text, usageLogId); // ★修正: 採番済みのログIDを次世代へ引き渡す
    }

    return data;
  };

  return await withRetry(() => processAnalysis());
};