import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- 🔄 Master Data Update Start ---');

  // [Issue #71] 消費税カテゴリーの追加・更新
  // upsertを使うことで、既に存在すれば更新、なければ作成されます
  const category9 = await prisma.category.upsert({
    where: { id: 9 },
    update: { 
      name: '消費税', 
      color: '#795548', 
      keywords: ['消費税', '外税', '税', '軽', '税金', 'tax'] 
    },
    create: { 
      id: 9, 
      name: '消費税', 
      color: '#795548', 
      keywords: ['消費税', '外税', '税', '軽', '税金', 'tax'] 
    },
  });

  console.log(`✅ Category updated: ${category9.name} (ID: ${category9.id})`);
  console.log('--- 🚀 Master Data Update Completed ---');
}

main()
  .catch((e) => {
    console.error('❌ Update Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });