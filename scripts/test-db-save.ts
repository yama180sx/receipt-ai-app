// scripts/test-db-save.ts
import { saveParsedReceipt } from '../src/services/receiptService';

async function main() {
  console.log('--- 🚀 トランザクション保存テスト開始 ---');

  // memberId 1 (あなた/管理者) を想定
  const targetMemberId = 1;

  const dummyData = {
    storeName: "テストスーパー 石狩店",
    purchaseDate: new Date().toISOString(), // サービス側で new Date() される想定
    totalAmount: 1280,
    rawText: "テスト用の生テキストデータ",
    items: [
      { name: "牛乳", price: 250, quantity: 1, categoryId: 1 },
      { name: "食パン", price: 180, quantity: 1, categoryId: 1 },
      { name: "高級和牛", price: 850, quantity: 1, categoryId: 2 }
    ]
  };

  try {
    // 引数の形式を現在のサービス関数定義に合わせて実行
    const result = await saveParsedReceipt(targetMemberId, dummyData);
    
    console.log('✅ 保存成功！');
    console.log('Receipt ID:', result.id);
    console.log('Store Name:', result.storeName);
    console.log('Items Count:', result.items.length);
    
    // 詳細を確認したい場合
    // console.log('Details:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('❌ 保存失敗（ロールバック確認）:', error);
  }
}

main();