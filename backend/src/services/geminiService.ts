import { GoogleGenerativeAI } from "@google/generative-ai";
import * as fs from "fs";
import * as path from "path";
import prisma from "../utils/prismaClient"; // 共通インスタンスを使用

export interface ParsedItem {
  name: string;
  price: number;
  quantity: number;
  inferredCategory?: string; 
}

export interface ParsedReceipt {
  storeName: string;
  purchaseDate: string; // YYYY-MM-DD
  totalAmount: number;
  items: ParsedItem[];
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// 環境変数から設定を取得（デフォルト値を定義）
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
    
    console.warn(`⚠️ Gemini APIリトライ中... 残り ${retries} 回 (Error: ${status})`);
    await new Promise(resolve => setTimeout(resolve, delay));
    return withRetry(fn, retries - 1, delay * 2);
  }
}

/**
 * レシート画像を解析し、トークン使用量をDBに記録します
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

        【計算と精度の指示】
        - 「単価(price)」と「数量(quantity)」の抽出には細心の注意を払ってください。
        - 「単価 × 数量 = 合計」の整合性をセルフチェックし、矛盾がある場合は画像内の他の数値を再探索してください。

        【返却形式】
        {
          "storeName": "店舗名",
          "purchaseDate": "ISO8601形式",
          "totalAmount": 数値,
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
        mimeType: getMimeType(imagePath), // 拡張子に合わせて動的に変更
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
        console.error("❌ ApiUsageLog の保存に失敗しました:", logError);
      }
    }

    const text = response.text();
    
    try {
      const data = JSON.parse(text) as ParsedReceipt;

      if (!data.totalAmount || data.totalAmount <= 0 || !data.items || data.items.length === 0) {
        throw new Error("解析データが空または不正です。");
      }

      return data;
    } catch (e) {
      if (e instanceof Error) throw e;
      throw new Error("Geminiのレスポンス解析に失敗しました。");
    }
  };

  return await withRetry(task);
};