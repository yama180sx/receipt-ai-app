import 'dotenv/config';
// analyzeReceiptImage と一緒に ParsedReceipt もインポートする
import { analyzeReceiptImage, ParsedReceipt } from '../src/services/geminiService'; 
import * as path from 'path';

async function test() {
  console.log("--- 🤖 Gemini 解析テスト開始 ---");

  // プロジェクトルートにある画像を指す
  const sampleImage = path.join(process.cwd(), 'sample_receipt.jpg');

  const familyGroupId = Number(process.env.RECEIPT_TEST_FAMILY_GROUP_ID);
  const memberId = Number(process.env.RECEIPT_TEST_MEMBER_ID);
  if (!Number.isSafeInteger(familyGroupId) || familyGroupId <= 0 || !Number.isSafeInteger(memberId) || memberId <= 0) {
    throw new Error('RECEIPT_TEST_FAMILY_GROUP_ID and RECEIPT_TEST_MEMBER_ID must be positive integers.');
  }

  try {
    // 型を明示的に指定（これで波線が消えます）
    const data: ParsedReceipt = await analyzeReceiptImage(sampleImage, memberId, familyGroupId);
    console.log("✅ 解析成功:");
    console.log(JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("❌ 解析失敗:", error);
  }
}

test();
