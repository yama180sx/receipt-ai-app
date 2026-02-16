import * as dotenv from 'dotenv';
dotenv.config();
import { processAndSaveReceipt } from '../src/services/receiptService';
import * as path from 'path';

async function test() {
  const sampleMemberId = 1; // 適宜テスト用の会員IDを指定
  // const sampleMemberId = 9999; // 存在しないIDに変更
  const sampleImage = path.join(process.cwd(), 'test-assets', 'sample_receipt.jpg');

  try {
    const receipt = await processAndSaveReceipt(sampleMemberId, sampleImage);
    console.log("🚀 全工程完了！DBの中身を確認してください。");
  } catch (error) {
    console.error("💥 統合テスト失敗:", error);
  }
}

test();