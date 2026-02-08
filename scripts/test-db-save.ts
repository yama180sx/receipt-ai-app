// scripts/test-db-save.ts
import { saveReceiptTransaction } from '../src/services/receiptService';

async function main() {
  console.log('--- トランザクション保存テスト開始 ---');

  const dummyData = {
    storeName: "テストスーパー 石狩店",
    transactionDate: new Date(),
    totalAmount: 1280,
    familyMemberId: 1, // ※DBに存在するIDを指定する必要があります
    items: [
      { name: "牛乳", price: 250, quantity: 1, categoryId: 1 },
      { name: "食パン", price: 180, quantity: 1, categoryId: 1 },
      { name: "高級和牛", price: 850, quantity: 1, categoryId: 2 }
    ]
  };

  try {
    const result = await saveReceiptTransaction(dummyData);
    console.log('✅ 保存成功！');
    console.log('Receipt ID:', result.receipt.id);
    console.log('Items Count:', result.items.length);
  } catch (error) {
    console.error('❌ 保存失敗（ロールバック確認）:', error);
  }
}

main();