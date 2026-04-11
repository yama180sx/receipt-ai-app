import { GoogleGenerativeAI } from "@google/generative-ai";
import * as fs from "fs";

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

async function withRetry<T>(
  fn: () => Promise<T>,
  retries: number = 3,
  delay: number = 2000 
): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const status = error?.status || error?.response?.status;
    const isRetryable = status === 429 || status >= 500;
    if (retries <= 0 || !isRetryable) throw error;
    
    console.warn(`⚠️ Gemini APIリトライ中... 残り ${retries} 回`);
    await new Promise(resolve => setTimeout(resolve, delay));
    return withRetry(fn, retries - 1, delay * 2);
  }
}

export const analyzeReceiptImage = async (imagePath: string): Promise<ParsedReceipt> => {
  const task = async () => {
    const model = genAI.getGenerativeModel({ 
      model: "gemini-flash-latest", 
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
        mimeType: "image/jpeg",
      },
    };

    const result = await model.generateContent([prompt, imageData]);
    const text = result.response.text();
    
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

  return await withRetry(task, 3);
};