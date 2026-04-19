import { GoogleGenerativeAI } from "@google/generative-ai";
import * as fs from "fs";
import { PrismaClient } from "@prisma/client";

// Prisma インスタンスのインポート（プロジェクトの構成に合わせてパスを調整してください）
// 一般的な構成を想定しています
const prisma = new PrismaClient();

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

/**
 * レシート画像を解析し、トークン使用量をDBに記録します
 * @param imagePath 画像のフルパス
 * @param familyMemberId 実行したユーザーのID（ログ記録用）
 */
export const analyzeReceiptImage = async (
  imagePath: string, 
  familyMemberId?: number
): Promise<ParsedReceipt> => {
  const task = async () => {
    const modelId = "gemini-flash-latest"; // 変数化してログで使用
    const model = genAI.getGenerativeModel({ 
      model: modelId, 
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

    // API呼び出し
    const result = await model.generateContent([prompt, imageData]);
    const response = await result.response;
    
    // --- [Issue #59] トークン使用量の記録開始 ---
    const usage = response.usageMetadata;
    if (usage) {
      try {
        await prisma.apiUsageLog.create({
          data: {
            familyMemberId: familyMemberId || null,
            modelId: modelId,
            promptTokens: usage.promptTokenCount,
            candidatesTokens: usage.candidatesTokenCount,
            totalTokens: usage.totalTokenCount,
            // receiptId はこの時点では未確定（保存前）のため、ここでは null
          }
        });
      } catch (logError) {
        // ログ保存の失敗で本体の解析処理を止めてはいけない
        console.error("❌ ApiUsageLog の保存に失敗しました:", logError);
      }
    }
    // --- 記録終了 ---

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

  return await withRetry(task, 3);
};