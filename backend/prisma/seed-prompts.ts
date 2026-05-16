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
      gas_station: "ガソリンスタンドの場合: 数量はL単位の小数（例: 35.42）である可能性が高い。単価(price)はリッター単価（3桁）を優先せよ。多くの場合、価格は税込（内税）であるため、taxAmountは0になる傾向がある。",
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

  console.log('✅ PromptTemplate initial seed completed with optimized Tax logic.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });