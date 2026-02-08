import * as dotenv from "dotenv";
dotenv.config();
import { GoogleGenerativeAI } from "@google/generative-ai";
async function run() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error("APIキーが.envに見当たりません");
        return;
    }
    const genAI = new GoogleGenerativeAI(apiKey);
    // 2.0-flash をフルパスで指定。これでも404なら 1.5-flash に切り替え
    const modelName = "models/gemini-2.0-flash";
    const model = genAI.getGenerativeModel({ model: modelName });
    try {
        console.log(`使用モデル: ${modelName} でリクエスト中...`);
        const result = await model.generateContent("「疎通確認成功」とだけ返してください。");
        console.log("Geminiからの返答:", result.response.text());
    }
    catch (e) {
        console.error("--- エラー発生 ---");
        console.error("ステータス:", e.status);
        console.error("メッセージ:", e.message);
        if (e.status === 429) {
            console.error("アドバイス: 無料枠の制限です。1分以上待つか、AI Studioで課金設定を確認してください。");
        }
    }
}
run();
