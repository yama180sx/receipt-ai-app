import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('--- 🚀 Seeding Start ---');

  // 1. 家族構成
  const familyMembers = [
    { id: 1, name: 'あなた（管理者）' },
    { id: 2, name: '妻' },
    { id: 3, name: '息子（高校生）' },
  ];

  for (const m of familyMembers) {
    await prisma.familyMember.upsert({
      where: { id: m.id },
      update: { name: m.name },
      create: m,
    });
  }

// 2. 費目カテゴリー & キーワード判定 (Categoryモデルに集約)
  // [Issue #14] colorを追加
  const categories = [
    { id: 1, name: '食費', keywords: ['鮭', 'そば', 'グラタン', '弁当', 'パン', 'おにぎり', '惣菜', 'サンド'], color: '#FF6B6B' },
    { id: 2, name: '日用品', keywords: ['洗剤', 'タオル', 'ティッシュ', '電池', '石鹸', 'マスク'], color: '#4DABF7' },
    { id: 3, name: '教育費', keywords: ['ノート', '参考書', '文具'], color: '#FCC419' },
    { id: 4, name: '光熱費', keywords: [], color: '#51CF66' },
    { id: 5, name: 'その他', keywords: [], color: '#ADB5BD' },
  ];

  for (const c of categories) {
    await prisma.category.upsert({
      where: { id: c.id },
      update: { 
        name: c.name, 
        keywords: c.keywords,
        color: c.color // 追加
      },
      create: {
        id: c.id,
        name: c.name,
        keywords: c.keywords,
        color: c.color // 追加
      },
    });
  }

  // 3. 店舗正規化マスタ (StoreMaster から Store に修正)
  const stores = [
    { officialName: 'セブン-イレブン', aliases: ['セブン', 'ｾﾌﾞﾝ', '7-11', 'セブンイレブン'] },
    { officialName: 'ローソン', aliases: ['ﾛｰｿﾝ', 'LAWSON'] },
    { officialName: 'ファミリーマート', aliases: ['ﾌｧﾐﾘｰﾏｰﾄ', 'ﾌｧﾐﾏ', 'FamilyMart'] },
    { officialName: 'セイコーマート', aliases: ['ｾｲｺｰﾏｰﾄ', 'ｾコマ', 'SeicoMart'] },
  ];

  for (const s of stores) {
    await prisma.store.upsert({
      where: { officialName: s.officialName },
      update: { aliases: s.aliases },
      create: s,
    });
  }

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