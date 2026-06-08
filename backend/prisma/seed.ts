import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import process from 'node:process';
import fs from 'node:fs';
import path from 'node:path';
import { syncAllSeedTableSequences, syncPostgresIdSequence } from './syncSequences';

const prisma = new PrismaClient();

const DEFAULT_CATEGORIES = [
  { id: 1, name: '食費', color: '#e74c3c', keywords: ['鮭', 'そば', 'グラタン', '弁当', 'パン', 'おにぎり', 'からあげ', '惣菜', 'サンド', '食料品', '青果', '精肉', '鮮魚', '飲料', '牛乳', '卵', '米', '麺', '調味料'] },
  { id: 2, name: '日用品', color: '#3498db', keywords: ['洗剤', 'タオル', 'ティッシュ', '電池', '石鹸', 'マスク', '雑貨', 'シャンプー', '台所用品', '清掃'] },
  { id: 3, name: '教育費', color: '#FCC419', keywords: ['ノート', '参考書', '文具', '筆記具', '教材', '受験'] },
  { id: 4, name: '光熱費', color: '#51CF66', keywords: ['電気', 'ガス', '水道', '灯油'] },
  { id: 5, name: '外食', color: '#f1c40f', keywords: ['カフェ', 'ランチ', 'ディナー', 'レストラン', 'マクドナルド', '吉野家', '弁当', 'セット'] },
  { id: 6, name: '交際費', color: '#9b59b6', keywords: ['プレゼント', '贈り物', '会費', '香典', '祝儀'] },
  { id: 7, name: '教養・娯楽', color: '#2ecc71', keywords: ['本', '雑誌', '映画', 'チケット', 'ゲーム', '遊園地'] },
  { id: 8, name: '交通費', color: '#95a5a6', keywords: ['電車', 'バス', 'タクシー', 'ガソリン', '駐車'] },
  { id: 9, name: '消費税', color: '#795548', keywords: ['消費税', '外税', '税', '軽', '税金', 'tax'] },
  { id: 99, name: 'その他', color: '#ADB5BD', keywords: [] as string[] },
];

const DEFAULT_STORES = [
  { officialName: 'セブン-イレブン', aliases: ['セブン', 'ｾﾌﾞﾝ', '7-11', 'セブンイレブン'] },
  { officialName: 'ローソン', aliases: ['ﾛｰｿﾝ', 'LAWSON'] },
  { officialName: 'ファミリーマート', aliases: ['ﾌｧﾐﾘｰﾏｰﾄ', 'ﾌｧﾐﾏ', 'FamilyMart'] },
  { officialName: 'セイコーマート', aliases: ['ｾｲｺｰﾏｰﾄ', 'ｾコマ', 'SeicoMart', 'セイコマ'] },
];

const DEFAULT_PROMPT = {
  key: 'RECEIPT_ANALYSIS',
  name: 'システム標準プロンプト',
  description: 'レシート画像から店舗名、日付、品目、税額を抽出するための基本プロンプト',
  systemPrompt: `レシート画像を解析し、正確なJSONデータを生成してください。
解析にあたっては、以下の思考プロセス（Chain of Thought）を順に実行すること。

### 思考プロセス
1. 【業態の判定】: 店舗名や品目から、そのレシートがどの業態（スーパー、ガソリンスタンド、薬局、飲食店等）か特定せよ。
2. 【数値の抽出】: 業態の特性を考慮し、数値（単価、数量、合計額、税額）を特定せよ。
3. 【税額の定義（重要）】: 
   - taxAmount は「品目の価格に含まれていない、別途加算される税額（外税）」として抽出せよ。
   - すべての品目が内税表記であり、品目の合計が totalAmount と一致する場合は、taxAmount を 0 とせよ。
4. 【整合性のセルフチェック】: (各品目の price * quantity の合計) + taxAmount = totalAmount
5. 【矛盾の解消】: 計算が合わない場合は再探索せよ。

### 出力形式 (JSONのみ)
{
  "storeName": "店舗名",
  "purchaseDate": "YYYY-MM-DD HH:mm",
  "totalAmount": 数値(整数),
  "taxAmount": 数値(小数可。外税のみ。内税の場合は0),
  "items": [
    { "name": "品名", "price": 数値(小数可), "quantity": 数値(小数可) }
  ]
}`,
  domainHints: {
    gas_station: 'ガソリンスタンドの場合: 数量はL単位の小数である可能性が高い。',
    pharmacy: '調剤薬局の場合: 最終的な支払額と連動する品目名と金額を抽出せよ。',
    bulk_sale: '量り売りの場合: 数量にグラム数や個数が含まれるケースに注意せよ。',
  },
  isActive: true,
  version: 1,
};

async function seedMastersForFamily(
  familyGroupId: number,
  options: { useExplicitCategoryIds?: boolean } = {}
) {
  for (const c of DEFAULT_CATEGORIES) {
    const { id, ...rest } = c;
    await prisma.category.create({
      data: {
        ...rest,
        familyGroupId,
        ...(options.useExplicitCategoryIds ? { id } : {}),
      },
    });
  }

  for (const s of DEFAULT_STORES) {
    await prisma.store.create({
      data: { ...s, familyGroupId },
    });
  }

  await prisma.promptTemplate.create({
    data: { ...DEFAULT_PROMPT, familyGroupId },
  });
}

async function main() {
  console.log('--- 🚀 Seeding Start (Multi-Tenancy Architecture) ---');

  const devPassword = process.env.SEED_MEMBER_PASSWORD ?? 'dev-password';
  const password_hash = await bcrypt.hash(devPassword, 10);

  await prisma.item.deleteMany();
  await prisma.settlementTransfer.deleteMany();
  await prisma.productMaster.deleteMany();
  await prisma.receipt.deleteMany();
  await prisma.familyMember.deleteMany();
  await prisma.promptTemplate.deleteMany();
  await prisma.store.deleteMany();
  await prisma.category.deleteMany();
  await prisma.familyGroup.deleteMany();

  console.log('🗑️ Existing data cleared.');

  const familyGroup = await prisma.familyGroup.create({
    data: { id: 1, name: '山本家', inviteCode: 'YAMAMOTO-2026' },
  });
  console.log(`🏠 FamilyGroup created: ${familyGroup.name}`);

  const familyMembers = [
    { id: 1, name: 'あなた（管理者）', familyGroupId: familyGroup.id, role: 'ADMIN' as const },
    { id: 2, name: '妻', familyGroupId: familyGroup.id, role: 'USER' as const },
    { id: 3, name: '息子（高校生）', familyGroupId: familyGroup.id, role: 'USER' as const },
  ];
  for (const m of familyMembers) {
    await prisma.familyMember.create({ data: { ...m, password_hash } });
  }
  console.log('👥 FamilyMembers created (山本家).');

  await seedMastersForFamily(familyGroup.id, { useExplicitCategoryIds: true });
  // 明示 id 投入後はシーケンスを進めないと第2世帯の auto-increment が id=1 で衝突する
  await syncPostgresIdSequence(prisma, 'Category');
  console.log('📂 Masters seeded (山本家).');

  await prisma.productMaster.create({
    data: {
      familyGroupId: familyGroup.id,
      name: 'サッポロ生ビール',
      storeName: 'セイコーマート',
      categoryId: 1,
    },
  });

  await prisma.receipt.create({
    data: {
      familyGroupId: familyGroup.id,
      memberId: 1,
      storeName: '山本家テスト店',
      date: new Date('2026-01-10T12:00:00.000Z'),
      totalAmount: 100,
      items: {
        create: { name: 'テスト商品', price: 100, quantity: 1, categoryId: 1 },
      },
    },
  });

  const familyGroup2 = await prisma.familyGroup.create({
    data: { id: 2, name: '佐藤家', inviteCode: 'SATO-2026' },
  });
  const family2Members = [
    { id: 4, name: '佐藤（管理者）', familyGroupId: familyGroup2.id, role: 'ADMIN' as const },
    { id: 5, name: '佐藤（配偶者）', familyGroupId: familyGroup2.id, role: 'USER' as const },
  ];
  for (const m of family2Members) {
    await prisma.familyMember.create({ data: { ...m, password_hash } });
  }
  console.log(`👥 FamilyMembers created (${familyGroup2.name}).`);

  await seedMastersForFamily(familyGroup2.id);
  console.log(`📂 Masters seeded (${familyGroup2.name}).`);

  const satoFoodCategory = await prisma.category.findFirst({
    where: { familyGroupId: familyGroup2.id, name: '食費' },
  });

  await prisma.receipt.create({
    data: {
      familyGroupId: familyGroup2.id,
      memberId: 4,
      storeName: '佐藤家テスト店',
      date: new Date('2026-01-15T12:00:00.000Z'),
      totalAmount: 500,
      imagePath: 'uploads/tenant-isolation-fixture.webp',
      items: {
        create: {
          name: '他世帯テスト商品',
          price: 500,
          quantity: 1,
          categoryId: satoFoodCategory!.id,
        },
      },
    },
  });
  console.log('🧾 Tenant isolation fixture receipt created (佐藤家).');

  const seedsDir = path.join(__dirname, 'seeds');
  if (!fs.existsSync(seedsDir)) {
    fs.mkdirSync(seedsDir, { recursive: true });
  }
  const prompts = await prisma.promptTemplate.findMany({
    where: { familyGroupId: familyGroup.id },
    orderBy: { id: 'asc' },
  });
  fs.writeFileSync(
    path.join(seedsDir, 'prompt_templates.json'),
    JSON.stringify(prompts, null, 2),
    'utf-8'
  );
  console.log('🤖 PromptTemplates JSON synced (山本家).');

  await syncAllSeedTableSequences(prisma);
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
