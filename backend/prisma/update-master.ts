import { PrismaClient } from '@prisma/client';
import { syncPostgresIdSequence } from './syncSequences';

const prisma = new PrismaClient();

/** 第1世帯向けマスタ更新（運用環境 — 全データ削除なし） */
async function main() {
  console.log('--- 🔄 Master Data Update Start ---');

  const defaultFamily = await prisma.familyGroup.findFirst({ orderBy: { id: 'asc' } });
  if (!defaultFamily) {
    throw new Error('FamilyGroup not found. Run prisma seed first.');
  }

  const category9 = await prisma.category.upsert({
    where: {
      name_familyGroupId: { name: '消費税', familyGroupId: defaultFamily.id },
    },
    update: {
      color: '#795548',
      keywords: ['消費税', '外税', '税', '軽', '税金', 'tax'],
    },
    create: {
      name: '消費税',
      familyGroupId: defaultFamily.id,
      color: '#795548',
      keywords: ['消費税', '外税', '税', '軽', '税金', 'tax'],
    },
  });

  console.log(`✅ Category updated: ${category9.name} (ID: ${category9.id}, Group: ${defaultFamily.id})`);
  await syncPostgresIdSequence(prisma, 'Category');
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
