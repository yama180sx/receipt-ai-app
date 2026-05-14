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
  purchaseDate: string; // YYYY-MM-DD HH:mm (重複検知精度向上のため時分まで取得)
  totalAmount: number;
  taxAmount?: number;    // [Issue #71] 外付けの消費税額
  items: ParsedItem[];
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// 環境変数から設定を取得
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";
const RETRY_COUNT = parseInt(process.env.GEMINI_RETRY_COUNT || "3", 10);
const RETRY_DELAY = parseInt(process.env.GEMINI_RETRY_DELAY || "2000", 10);

/**
 * ファイル拡張子から適切なMIMEタイプを返却
 */
const getMimeType = (filePath: string): string => {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".png": return "image/png";
    case ".webp": return "image/webp";
    case ".heic": return "image/heic";
    default: return "image/jpeg";
  }
};

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
 * レシート画像を解析し、税額と時刻を含む構造化データを抽出します
 */
export const analyzeReceiptImage = async (
  imagePath: string, 
  familyMemberId?: number
): Promise<ParsedReceipt> => {
  const task = async () => {
    const model = genAI.getGenerativeModel({ 
      model: GEMINI_MODEL, 
      generationConfig: { responseMimeType: "application/json" }
    });

    const prompt = `
        レシート画像を解析し、以下のJSON形式でデータのみを返してください。

        【抽出と精度の指示】
        1. 購入日時(purchaseDate): 
           - レシートに印字されている「年月日」と「時刻（時分）」を抽出してください。
           - 書式は必ず "YYYY-MM-DD HH:mm" としてください。
           - 時刻が不明な場合のみ "YYYY-MM-DD 00:00" としてください。
        2. 消費税(taxAmount): 
           - 小計の後に別途「消費税」「外税」等として加算されている税額がある場合は、その合計を taxAmount に格納し、items には含めないでください。
           - 明細の中に内税として含まれている場合は、taxAmount は 0 としてください。
        3. 整合性チェック: 
           - 「(各品目の単価 × 数量) の合計 + taxAmount = totalAmount」が成立するように数値を精査してください。
           - 矛盾がある場合は、画像内の数値を再確認してください。

        【返却形式】
        {
          "storeName": "店舗名",
          "purchaseDate": "YYYY-MM-DD HH:mm",
          "totalAmount": 数値,
          "taxAmount": 数値,
          "items": [
            { "name": "品名", "price": 数値, "quantity": 数値 }
          ]
        }
      `;

    if (!fs.existsSync(imagePath)) {
      throw new Error(`File not found: ${imagePath}`);
    }

    const imageData = {
      inlineData: {
        data: fs.readFileSync(imagePath).toString("base64"),
        mimeType: getMimeType(imagePath),
      },
    };

    // API呼び出し
    const result = await model.generateContent([prompt, imageData]);
    const response = await result.response;
    
    // トークン使用量の記録
    const usage = response.usageMetadata;
    if (usage) {
      try {
        await prisma.apiUsageLog.create({
          data: {
            familyMemberId: familyMemberId || null,
            modelId: GEMINI_MODEL,
            promptTokens: usage.promptTokenCount,
            candidatesTokens: usage.candidatesTokenCount,
            totalTokens: usage.totalTokenCount,
          }
        });
      } catch (logError) {
        logger.error("❌ ApiUsageLog の保存に失敗しました:", logError);
      }
    }

    const text = response.text();
    
    try {
      const data = JSON.parse(text) as ParsedReceipt;

      if (!data.totalAmount || data.totalAmount <= 0 || !data.items || data.items.length === 0) {
        logger.error(`[Gemini Response Error] 解析データが不完全です: ${text}`);
        throw new Error("解析データが空または不正です。");
      }

      // 数値型の初期化（undefined回避）
      data.taxAmount = data.taxAmount || 0;

      return data;
    } catch (e) {
      logger.error(`[JSON Parse Error] Raw Response: ${text}`);
      if (e instanceof Error) throw e;
      throw new Error("Geminiのレスポンス解析に失敗しました。");
    }
  };

  return await withRetry(task);
};