import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const analysisPrompt = {
    key: "RECEIPT_ANALYSIS",
    description: "レシート画像から店舗名、日付、品目、税額を抽出するための基本プロンプト",
    systemPrompt: `レシート画像を解析し、正確なJSONデータを生成してください。
解析にあたっては、以下の思考プロセス（Chain of Thought）を順に実行すること。

### 思考プロセス
1. 【業態の判定】: 店舗名や品目から、そのレシートがどの業態（スーパー、ガソリンスタンド、薬局、飲食店等）か特定せよ。
2. 【数値の抽出】: 業態の特性を考慮し、数値（単価、数量、合計額、税額）を特定せよ。特に、給油レシートの場合は数量(L)が小数になることに注意せよ。
3. 【整合性のセルフチェック】: 以下の算術式が成立するか確認せよ。
   式: (各品目の price * quantity の合計) + taxAmount = totalAmount
4. 【矛盾の解消】: もし計算が合わない場合は、画像内の他の数値を再探索し、最も確からしい組み合わせを再構築せよ。

### 出力形式 (JSONのみ)
{
  "storeName": "店舗名",
  "purchaseDate": "YYYY-MM-DD HH:mm",
  "totalAmount": 数値(整数),
  "taxAmount": 数値(小数可),
  "items": [
    { "name": "品名", "price": 数値(小数可), "quantity": 数値(小数可) }
  ]
}`,
    domainHints: {
      gas_station: "ガソリンスタンドの場合: 数量はL単位の小数（例: 35.42）である可能性が高い。単価(price)はリッター単価（3桁）を優先せよ。",
      pharmacy: "調剤薬局の場合: 薬剤料や点数ではなく、最終的な支払額と連動する品目名と金額を抽出せよ。",
      bulk_sale: "量り売りの場合: 数量にグラム数や個数が含まれるケースに注意せよ。"
    },
    isActive: true,
    version: 1
  };

  await prisma.promptTemplate.upsert({
    where: { key: analysisPrompt.key },
    update: analysisPrompt,
    create: analysisPrompt,
  });

  console.log('✅ PromptTemplate initial seed completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });