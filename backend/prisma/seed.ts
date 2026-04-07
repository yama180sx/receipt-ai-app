import { PrismaClient } from '@prisma/client';
import process from 'node:process';

const prisma = new PrismaClient();

async function main() {
  console.log('--- 🚀 Seeding Start (Multi-Tenancy Architecture) ---');

  // 0. 既存データのクリーンアップ（制約の逆順で削除）
  await prisma.item.deleteMany();
  await prisma.productMaster.deleteMany();
  await prisma.receipt.deleteMany();
  await prisma.familyMember.deleteMany();
  await prisma.familyGroup.deleteMany();
  await prisma.store.deleteMany();
  await prisma.category.deleteMany();
  
  console.log('🗑️ Existing data cleared.');

  // 1. 世帯（FamilyGroup）の作成
  const familyGroup = await prisma.familyGroup.create({
    data: {
      id: 1,
      name: '山本家',
      inviteCode: 'YAMAMOTO-2026',
    }
  });
  console.log(`🏠 FamilyGroup created: ${familyGroup.name}`);

  // 2. 家族構成
  const familyMembers = [
    { id: 1, name: 'あなた（管理者）', familyGroupId: familyGroup.id },
    { id: 2, name: '妻', familyGroupId: familyGroup.id },
    { id: 3, name: '息子（高校生）', familyGroupId: familyGroup.id },
  ];

  for (const m of familyMembers) {
    await prisma.familyMember.create({ data: m });
  }
  console.log('👥 FamilyMembers created.');

  // 3. 費目カテゴリー
  const categories = [
    { id: 1, name: '食費', color: '#e74c3c', keywords: ['鮭', 'そば', 'グラタン', '弁当', 'パン', 'おにぎり', "からあげ", '惣菜', 'サンド', '食料品', '青果', '精肉', '鮮魚', '飲料', '牛乳', '卵', '米', '麺', '調味料'] },
    { id: 2, name: '日用品', color: '#3498db', keywords: ['洗剤', 'タオル', 'ティッシュ', '電池', '石鹸', 'マスク', '雑貨', 'シャンプー', '台所用品', '清掃'] },
    { id: 3, name: '教育費', color: '#FCC419', keywords: ['ノート', '参考書', '文具', '筆記具', '教材', '受験'] },
    { id: 4, name: '光熱費', color: '#51CF66', keywords: ['電気', 'ガス', '水道', '灯油'] },
    { id: 5, name: '外食', color: '#f1c40f', keywords: ['カフェ', 'ランチ', 'ディナー', 'レストラン', 'マクドナルド', '吉野家', '弁当', 'セット'] },
    { id: 6, name: '交際費', color: '#9b59b6', keywords: ['プレゼント', '贈り物', '会費', '香典', '祝儀'] },
    { id: 7, name: '教養・娯楽', color: '#2ecc71', keywords: ['本', '雑誌', '映画', 'チケット', 'ゲーム', '遊園地'] },
    { id: 8, name: '交通費', color: '#95a5a6', keywords: ['電車', 'バス', 'タクシー', 'ガソリン', '駐車'] },
    { id: 99, name: 'その他', color: '#ADB5BD', keywords: [] },
  ];

  for (const c of categories) {
    await prisma.category.create({ data: c });
  }

  // 4. 店舗正規化マスタ (修正箇所: alignItemsを削除)
  const stores = [
    { officialName: 'セブン-イレブン', aliases: ['セブン', 'ｾﾌﾞﾝ', '7-11', 'セブンイレブン'] },
    { officialName: 'ローソン', aliases: ['ﾛｰｿﾝ', 'LAWSON'] },
    { officialName: 'ファミリーマート', aliases: ['ﾌｧﾐﾘｰﾏｰﾄ', 'ﾌｧﾐﾏ', 'FamilyMart'] },
    { officialName: 'セイコーマート', aliases: ['ｾｲｺｰﾏｰﾄ', 'ｾコマ', 'SeicoMart', 'セイコマ'] },
  ];

  for (const s of stores) {
    await prisma.store.create({ data: s });
  }

  // 5. 学習マスタの初期サンプル
  await prisma.productMaster.create({
    data: {
      familyGroupId: familyGroup.id,
      name: 'サッポロ生ビール',
      storeName: 'セイコーマート',
      categoryId: 1,
    }
  });

  console.log('✅ Seeding Completed.');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });