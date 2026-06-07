import { PrismaClient } from '@prisma/client';
import process from 'node:process';
import fs from 'node:fs';
import path from 'node:path';
import { syncAllSeedTableSequences } from './syncSequences';

const prisma = new PrismaClient();

async function main() {
  console.log('--- 🚀 Seeding Start (Multi-Tenancy Architecture) ---');

  // 0. 既存データのクリーンアップ
  await prisma.item.deleteMany();
  await prisma.settlementTransfer.deleteMany();
  await prisma.productMaster.deleteMany();
  await prisma.receipt.deleteMany();
  await prisma.familyMember.deleteMany();
  await prisma.familyGroup.deleteMany();
  await prisma.store.deleteMany();
  await prisma.category.deleteMany();
  await prisma.promptTemplate.deleteMany(); // ★ 追加: プロンプトのクリーンアップ
  
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
    { id: 1, name: 'あなた（管理者）', familyGroupId: familyGroup.id, role: 'ADMIN' as const },
    { id: 2, name: '妻', familyGroupId: familyGroup.id, role: 'USER' as const },
    { id: 3, name: '息子（高校生）', familyGroupId: familyGroup.id, role: 'USER' as const },
  ];

  for (const m of familyMembers) {
    await prisma.familyMember.create({ data: m });
  }
  console.log('👥 FamilyMembers created (山本家).');

  // 1b. 第2世帯（テナント分離テスト用 — Issue #93-1）
  const familyGroup2 = await prisma.familyGroup.create({
    data: {
      id: 2,
      name: '佐藤家',
      inviteCode: 'SATO-2026',
    },
  });
  const family2Members = [
    { id: 4, name: '佐藤（管理者）', familyGroupId: familyGroup2.id, role: 'ADMIN' as const },
    { id: 5, name: '佐藤（配偶者）', familyGroupId: familyGroup2.id, role: 'USER' as const },
  ];
  for (const m of family2Members) {
    await prisma.familyMember.create({ data: m });
  }
  console.log(`👥 FamilyMembers created (${familyGroup2.name}).`);

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
    { id: 9, name: '消費税', color: '#795548', keywords: ['消費税', '外税', '税', '軽', '税金', 'tax'] },
    { id: 99, name: 'その他', color: '#ADB5BD', keywords: [] },
  ];

  for (const c of categories) {
    await prisma.category.create({ data: c });
  }

  // 第2世帯のテナント分離 fixture（Category 投入後）
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
          categoryId: 1,
        },
      },
    },
  });
  console.log('🧾 Tenant isolation fixture receipt created (佐藤家).');

  // 4. 店舗正規化マスタ
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

  // ★ 6. プロンプトテンプレートのシード (JSONからの復元と自動生成)
  const seedsDir = path.join(__dirname, 'seeds');
  const promptJsonPath = path.join(seedsDir, 'prompt_templates.json');

  if (!fs.existsSync(seedsDir)) {
    fs.mkdirSync(seedsDir, { recursive: true });
  }

  let promptData: any[] = [];
  
  // JSONファイルが存在する場合はそこから読み込む
  if (fs.existsSync(promptJsonPath)) {
    console.log('📄 Loading prompt templates from JSON...');
    const fileContent = fs.readFileSync(promptJsonPath, 'utf-8');
    promptData = JSON.parse(fileContent);
  } else {
    // 存在しない場合は、過去の最適化済みプロンプトを初期データとして生成
    console.log('📄 JSON file not found. Creating default prompt template...');
    promptData = [
      {
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
   - レシート全体の合計額と、抽出した各品目(price * quantity)の合計額に差がある場合、その差額が税額（外税）として妥当か検証せよ。
4. 【整合性のセルフチェック】: 以下の算術式が厳密に成立するか確認せよ。
   式: (各品目の price * quantity の合計) + taxAmount = totalAmount
5. 【矛盾の解消】: もし計算が合わない場合は、画像内の数値を再探索し、最も確からしい組み合わせを再構築せよ。

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
          "gas_station": "ガソリンスタンドの場合: 数量はL単位の小数（例: 35.42）である可能性が高い。単価(price)はリッター単価（3桁）を優先せよ。多くの場合、価格は税込（内税）であるため、taxAmountは0になる傾向がある。",
          "pharmacy": "調剤薬局の場合: 薬剤料や点数ではなく、最終的な支払額と連動する品目名と金額を抽出せよ。",
          "bulk_sale": "量り売りの場合: 数量にグラム数や個数が含まれるケースに注意せよ。"
        },
        isActive: true,
        version: 1
      }
    ];
    // 初期データをJSONファイルとして保存
    fs.writeFileSync(promptJsonPath, JSON.stringify(promptData, null, 2), 'utf-8');
  }

  // JSONから読み込んだ（または生成した）データをDBに投入
  for (const p of promptData) {
    await prisma.promptTemplate.create({
      data: {
        key: p.key,
        name: p.name,
        description: p.description,
        systemPrompt: p.systemPrompt,
        domainHints: p.domainHints,
        isActive: p.isActive,
        version: p.version,
      }
    });
  }
  console.log('🤖 PromptTemplates seeded.');

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