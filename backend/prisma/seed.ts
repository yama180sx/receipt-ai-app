import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- 🚀 Seeding Start (Data Reset & Full Merge) ---');

  // 0. 既存データのクリーンアップ（依存関係の逆順で削除）
  await prisma.item.deleteMany();
  await prisma.productMaster.deleteMany();
  await prisma.receipt.deleteMany();
  await prisma.store.deleteMany();
  await prisma.category.deleteMany();
  await prisma.familyMember.deleteMany();
  console.log('🗑️ Existing data cleared.');

  // 1. 家族構成
  const familyMembers = [
    { id: 1, name: 'あなた（管理者）' },
    { id: 2, name: '妻' },
    { id: 3, name: '息子（高校生）' },
  ];

  for (const m of familyMembers) {
    await prisma.familyMember.create({ data: m });
  }

  // 2. 費目カテゴリー & キーワード統合
  // 以前の提案内容と今回の追加内容をマージ
  const categories = [
    { 
      id: 1, 
      name: '食費', 
      color: '#e74c3c', 
      keywords: ['鮭', 'そば', 'グラタン', '弁当', 'パン', 'おにぎり', "からあげ", '惣菜', 'サンド', '食料品', '青果', '精肉', '鮮魚', '飲料', '牛乳', '卵', '米', '麺', '調味料'] 
    },
    { 
      id: 2, 
      name: '日用品', 
      color: '#3498db', 
      keywords: ['洗剤', 'タオル', 'ティッシュ', '電池', '石鹸', 'マスク', '雑貨', 'シャンプー', '台所用品', '清掃'] 
    },
    { 
      id: 3, 
      name: '教育費', 
      color: '#FCC419', 
      keywords: ['ノート', '参考書', '文具', '筆記具', '教材', '受験'] 
    },
    { 
      id: 4, 
      name: '光熱費', 
      color: '#51CF66', 
      keywords: ['電気', 'ガス', '水道', '灯油'] 
    },
    { 
      id: 5, 
      name: '外食', 
      color: '#f1c40f', 
      keywords: ['カフェ', 'ランチ', 'ディナー', 'レストラン', 'マクドナルド', '吉野家', '弁当', 'セット'] 
    },
    { 
      id: 6, 
      name: '交際費', 
      color: '#9b59b6', 
      keywords: ['プレゼント', '贈り物', '会費', '香典', '祝儀'] 
    },
    { 
      id: 7, 
      name: '教養・娯楽', 
      color: '#2ecc71', 
      keywords: ['本', '雑誌', '映画', 'チケット', 'ゲーム', '遊園地'] 
    },
    { 
      id: 8, 
      name: '交通費', 
      color: '#95a5a6', 
      keywords: ['電車', 'バス', 'タクシー', 'ガソリン', '駐車'] 
    },
    { 
      id: 99, 
      name: 'その他', 
      color: '#ADB5BD', 
      keywords: [] 
    },
  ];

  for (const c of categories) {
    await prisma.category.create({ data: c });
  }

  // 3. 店舗正規化マスタ
  const stores = [
    { officialName: 'セブン-イレブン', aliases: ['セブン', 'ｾﾌﾞﾝ', '7-11', 'セブンイレブン'] },
    { officialName: 'ローソン', aliases: ['ﾛｰｿﾝ', 'LAWSON'] },
    { officialName: 'ファミリーマート', aliases: ['ﾌｧﾐﾘｰﾏｰﾄ', 'ﾌｧﾐﾏ', 'FamilyMart'] },
    { officialName: 'セイコーマート', aliases: ['ｾｲｺｰﾏｰﾄ', 'ｾコマ', 'SeicoMart', 'セイコマ'] },
  ];

  for (const s of stores) {
    await prisma.store.create({ data: s });
  }

  console.log('✅ Seeding Completed with Merged Categories.');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    // @types/node が入っていれば process はグローバルで参照可能です
    if (typeof process !== 'undefined') process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });