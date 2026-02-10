import { GoogleGenerativeAI } from "@google/generative-ai";
import * as fs from "fs";

export interface ParsedItem {
  name: string;
  price: number;
  quantity: number;
}

export interface ParsedReceipt {
  storeName: string;
  purchaseDate: string;
  totalAmount: number;
  items: ParsedItem[];
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export const analyzeReceiptImage = async (imagePath: string): Promise<ParsedReceipt> => {
  // エイリアスを使用することで、429(limit: 0)を回避できる可能性が最も高いです
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

    // --- ここに追加：業務ロジックバリデーション ---
    if (data.totalAmount <= 0 || !data.items || data.items.length === 0) {
      throw new Error("解析結果が不正です。画像の解像度やプロンプトを確認してください。");
    }
    // ------------------------------------------

    return data;
  } catch (e) {
    // JSONパースエラー、または上記のバリデーションエラーをここでキャッチ
    if (e instanceof Error) {
      console.error("解析エラー:", e.message);
      throw e;
    }
    throw new Error("Geminiからのレスポンスを処理できませんでした。");
  }
};