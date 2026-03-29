import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

async function run() {
  try {
    // getGenerativeModel を通じて、モデルを指定して疎通確認するのが現在の主流です
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    console.log("✅ モデル取得成功。APIキーは有効です。");
  } catch (e) {
    console.error("❌ モデル取得失敗:", e);
  }
}
run();