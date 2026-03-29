import { GoogleGenerativeAI } from "@google/generative-ai";
import * as fs from "fs";

export interface ParsedItem {
  name: string;
  price: number;
  quantity: number;
  inferredCategory: string;
}

export interface ParsedReceipt {
  storeName: string;
  purchaseDate: string;
  totalAmount: number;
  items: ParsedItem[];
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

/**
 * 指数バックオフを用いたリトライラッパー
 * ステップ1: APIの安定性を向上させる
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  retries: number = 3,
  delay: number = 2000 // T320の負荷も考慮し、少し長めの2秒から開始
): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    // 429(Rate Limit) や 500以上のサーバーエラーのみリトライ対象とする
    // Gemini API特有のエラー構造に対応
    const status = error?.status || error?.response?.status;
    const isRetryable = status === 429 || status >= 500;

    if (retries <= 0 || !isRetryable) {
      throw error;
    }

    console.warn(`⚠️ Gemini APIエラー (Status: ${status})。リトライします... 残り ${retries} 回`);
    
    await new Promise(resolve => setTimeout(resolve, delay));
    return withRetry(fn, retries - 1, delay * 2);
  }
}

export const analyzeReceiptImage = async (imagePath: string): Promise<ParsedReceipt> => {
  // 元々のメインロジックを task 関数として定義
  const task = async () => {
    const model = genAI.getGenerativeModel({ 
      model: "gemini-flash-latest",
      generationConfig: { responseMimeType: "application/json" }
    });

    const prompt = `
      レシート画像を解析し、以下のJSON形式でデータのみを返してください。
      {
        "storeName": "店舗名",
        "purchaseDate": "ISO8601形式",
        "totalAmount": 数値,
        "items": [{ "name": "品名", "price": 数値, "quantity": 数値 }]
      }
    `;

    if (!fs.existsSync(imagePath)) {
      throw new Error(`File not found: ${imagePath}`);
    }

    const imageData = {
      inlineData: {
        data: fs.readFileSync(imagePath).toString("base64"),
        mimeType: "image/jpeg",
      },
    };

    const result = await model.generateContent([prompt, imageData]);
    const text = result.response.text();
    
    try {
      const data = JSON.parse(text) as ParsedReceipt;

      if (data.totalAmount <= 0 || !data.items || data.items.length === 0) {
        throw new Error("解析結果が不正です。画像の解像度やプロンプトを確認してください。");
      }

      return data;
    } catch (e) {
      if (e instanceof Error) {
        console.error("解析エラー:", e.message);
        throw e;
      }
      throw new Error("Geminiからのレスポンスを処理できませんでした。");
    }
  };

  // task をリトライラッパーで実行
  return await withRetry(task, 3);
};